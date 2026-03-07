package controller

import (
	"Cubify/internal/cache"
	"Cubify/internal/config"
	"Cubify/internal/file"
	"Cubify/internal/github"
	"Cubify/internal/installer"
	"Cubify/internal/instance"
	logger "Cubify/internal/logging"
	"Cubify/internal/mc"
	"Cubify/internal/updater"
	"Cubify/internal/utils"
	"context"
	"fmt"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)



type Controller struct {
	l *logger.Logger
	cfg *config.Config
	ghClient *github.Client
	cm *cache.CacheManager
	installer *installer.Installer
	mc *mc.Mc
	IM *instance.Manager
}

func New(cfg *config.Config, l *logger.Logger) *Controller {
	return &Controller{
		l: l,
		cfg: cfg,
		ghClient: github.New(cfg.BaseURL, cfg.AuthToken, cfg.CacheDirectory, l),
		cm: cache.New(cfg.CacheDirectory),
		installer: installer.New(cfg.BinDirectory),
		IM: instance.NewManager(l, file.NewManager(file.NewLocalBackend("")), cfg.InstancesDirectory),
	}
}


func (c *Controller) Fetch() ([]instance.Instance, error) {
	index, err := c.ghClient.GetIndex(c.cfg.IndexURL)
	if err != nil {
		return nil, err
	}
	
	instances := []instance.Instance{}
	for _, instanceRepo := range index.Instances {
		instance, err := c.ghClient.GetInstance(instanceRepo)
		if err != nil {
			c.l.Error("Error while getting instance %s: %v", instanceRepo, err)
			continue
		}
		if len(instance.Releases) <= 0 {
			c.l.Info("Skipping %s, no available releases", instanceRepo)
			continue
		}

		instance.Slug = utils.InstanceSlug(instance.Releases[0].Meta.Name)
		instance.Repo = instanceRepo
		instances = append(instances, *instance)
	}

	return instances, nil
}

func (c *Controller) Run(release instance.Release) error {
	if err := c.installer.RetrievePortableMC(); err != nil {
		return err
	}

	bin := c.installer.GetExecutablePath()
	c.mc = mc.New(bin, c.cfg.InstancesDirectory, c.cfg.JVMPath, c.l)
	c.l.Info("Preparing Minecraft...")
	c.mc.Prepare(release.Meta.Name, release.Meta.Loader, release.Meta.LoaderVersion, release.Meta.MinecraftVersion)
	c.l.Info("Checking for updates...")
	instanceDirectory := utils.InstanceSlug(release.Meta.Name)
	fullInstancePath := filepath.Join(c.cfg.InstancesDirectory, instanceDirectory)
	if err := c.updateInstanceContent(fullInstancePath, release.Meta.Containers); err != nil {
		c.l.Error("Update warning: %v", err)
		return fmt.Errorf("failed to update instance: %w", err)
	}
	localInstance, err := c.IM.GetBySlug(instanceDirectory)
	if err != nil {
		return err
	}

	localInstance.Release = &release

	if err := c.IM.Put(localInstance); err != nil {
		return err
	}

	
	c.l.Info("Launching Minecraft!")
	c.mc.Run(release.Meta.Name, release.Meta.Loader, release.Meta.LoaderVersion, release.Meta.MinecraftVersion, c.cfg.User.UUID, c.cfg.Nickname)
	return nil
}


func (c *Controller) updateInstanceContent(instancePath string, releaseContainers []instance.Container) error {
	m := file.NewManager(file.NewLocalBackend(instancePath))

	var installedContainers []instance.Container

	m.ReadJson("installed.json", &installedContainers)

	findInstalled := func(contentType string) instance.Container {
		for _, cont := range installedContainers {
			if cont.ContentType == contentType {
				return cont
			}
		}
		return instance.Container{ContentType: contentType, Content: []instance.Content{}}
	}

	for _, newContainer := range releaseContainers {
		oldContainer := findInstalled(newContainer.ContentType)
		
		processor := updater.NewContentProcessor(newContainer, oldContainer, m, c.l)
		if err := processor.Process(); err != nil {
			return err
		}
	}

	if err := m.SaveJson("installed.json", releaseContainers); err != nil {
		return err
	}

	return nil
}

func (c *Controller) RefreshLocalReleases() error {
	localInstances, err := c.IM.List()
	if err != nil {
		return fmt.Errorf("failed to list local instances: %w", err)
	}

	for _, li := range localInstances {
		if li.Repo == "" {
			continue
		}

		remote, err := c.ghClient.GetInstance(li.Repo)
		if err != nil {
			c.l.Error("failed to refresh releases for %s: %v", li.Repo, err)
			continue
		}

		if len(remote.Releases) <= 0 {
			c.l.Error("remote not contain any releases, so skip %s: %v", li.Repo, err)
			continue
		}

		li.Releases = remote.Releases

		if err := c.IM.Put(li); err != nil {
			c.l.Error("failed to save updated instance %s: %v", li.Slug, err)
			continue
		}

		c.l.Info("refreshed %d releases for %s", len(remote.Releases), li.Repo)
	}

	return nil
}

func (c *Controller) StartMicrosoftLogin(ctx context.Context) error {
	if err := c.installer.RetrievePortableMC(); err != nil {
		return err
	}

	bin := c.installer.GetExecutablePath()

	mcInstance := mc.New(bin, c.cfg.InstancesDirectory, c.cfg.JVMPath, c.l)

	go func() {
		err := mcInstance.AuthenticateMicrosoft(
			func(url, code string) {
				runtime.EventsEmit(ctx, "auth:code", map[string]string{
					"url":  url,
					"code": code,
				})
			},
			func(uuid, username string) {
				c.cfg.User.Username = username
				c.cfg.User.UUID = uuid
				c.cfg.User.AuthType = "microsoft"
				c.cfg.Save("config.json")

				runtime.EventsEmit(ctx, "auth:success", map[string]string{
					"username": username,
					"uuid":     uuid,
				})
			},
		)

		if err != nil {
			c.l.Error("Auth error: %v", err)
			runtime.EventsEmit(ctx, "auth:error", err.Error())
		}
	}()
	return nil
}