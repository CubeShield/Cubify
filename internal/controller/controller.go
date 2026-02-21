package controller

import (
	"Cubify/internal/cache"
	"Cubify/internal/config"
	"Cubify/internal/github"
	"Cubify/internal/installer"
	"Cubify/internal/mc"
	"context"
	"log"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)



type Controller struct {
	cfg *config.Config
	ghClient *github.Client
	cm *cache.CacheManager
	installer *installer.Installer
	mc *mc.Mc
}

func New(cfg *config.Config) *Controller {
	return &Controller{
		cfg: cfg,
		ghClient: github.New(cfg.BaseURL, cfg.AuthToken, cfg.CacheDirectory),
		cm: cache.New(cfg.CacheDirectory),
		installer: installer.New(cfg.BinDirectory),
	}
}



func (c *Controller) Fetch() ([]github.Instance, error) {
	index, err := c.ghClient.GetIndex(c.cfg.IndexURL)
	if err != nil {
		return nil, err
	}

	instances := []github.Instance{}
	for _, instanceRepo := range index.Instances {
		instance, err := c.ghClient.GetInstance(instanceRepo)
		if err != nil {
			log.Printf("Error while getting instance %s: %v", instanceRepo, err)
			continue
		}

		instances = append(instances, *instance)
	}

	return instances, nil
}

func (c *Controller) Run(release github.Release) error {
	if err := c.installer.RetrievePortableMC(); err != nil {
		return err
	}

	bin := c.installer.GetExecutablePath()
	c.mc = mc.New(bin, c.cfg.InstancesDirectory)
	c.mc.Prepare(release.Meta.Name, release.Meta.Loader, release.Meta.LoaderVersion, release.Meta.MinecraftVersion)
	
	


	c.mc.Run(release.Meta.Name, release.Meta.Loader, release.Meta.LoaderVersion, release.Meta.MinecraftVersion, c.cfg.User.UUID, c.cfg.Nickname)
	return nil
}

func (c *Controller) StartMicrosoftLogin(ctx context.Context) error {
	if err := c.installer.RetrievePortableMC(); err != nil {
		return err
	}

	bin := c.installer.GetExecutablePath()

	mcInstance := mc.New(bin, c.cfg.InstancesDirectory)

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
			log.Printf("Auth error: %v", err)
			runtime.EventsEmit(ctx, "auth:error", err.Error())
		}
	}()
	return nil
}