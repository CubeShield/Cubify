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
	"time"

	"github.com/jlaffaye/ftp"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)



type Controller struct {
	l *logger.Logger
	cfg *config.Config
	ghClient *github.Client
	cm *cache.CacheManager
	installer *installer.Installer
	mc *mc.Mc
	fm file.Manager
	IM *instance.Manager
}

func New(cfg *config.Config, l *logger.Logger, fm file.Manager) *Controller {
	cm := cache.New(fm.Sub("cache"))
	return &Controller{
		l: l,
		cfg: cfg,
		ghClient: github.New(cfg.BaseURL, cfg.AuthToken, l, cm),
		installer: installer.New(fm.Sub("bin")),
		fm: fm,
		IM: instance.NewManager(l, fm.Sub("instances")),
	}
}


func (c *Controller) Fetch() ([]instance.Instance, error) {
	seenRepos := map[string]bool{}
	instances := []instance.Instance{}

	for _, indexURL := range c.cfg.IndexURLs {
		index, err := c.ghClient.GetIndex(indexURL)
		if err != nil {
			c.l.Error("failed to fetch index %s: %v", indexURL, err)
			continue
		}

		for _, instanceRepo := range index.Instances {
			if seenRepos[instanceRepo] {
				continue
			}
			seenRepos[instanceRepo] = true

			inst, err := c.ghClient.GetInstance(instanceRepo)
			if err != nil {
				c.l.Error("Error while getting instance %s: %v", instanceRepo, err)
				continue
			}
			if len(inst.Releases) <= 0 {
				c.l.Info("Skipping %s, no available releases", instanceRepo)
				continue
			}

			inst.Slug = utils.InstanceSlug(inst.Releases[0].Meta.Name)
			inst.Repo = instanceRepo
			instances = append(instances, *inst)
		}
	}

	return instances, nil
}

func (c *Controller) Run(ctx context.Context, release instance.Release, onProgress func(step, total int, label string)) error {
	const totalSteps = 4

	onProgress(1, totalSteps, "Загрузка PortableMC...")
	if err := c.installer.RetrievePortableMC(); err != nil {
		return err
	}

	if ctx.Err() != nil {
		return ctx.Err()
	}

	bin := c.installer.GetExecutablePath()
	c.mc = mc.New(bin, c.fm.Sub("instances").BasePath(), c.cfg.JVMPath, c.cfg.JVMMinRAM, c.cfg.JVMMaxRAM, c.l)

	onProgress(2, totalSteps, "Подготовка Minecraft...")
	c.l.Info("Preparing Minecraft...")
	if err := c.mc.Prepare(ctx, release.Meta.Name, release.Meta.Loader, release.Meta.LoaderVersion, release.Meta.MinecraftVersion); err != nil {
		return fmt.Errorf("prepare failed: %w", err)
	}

	if ctx.Err() != nil {
		return ctx.Err()
	}

	onProgress(3, totalSteps, "Обновление контента...")
	c.l.Info("Checking for updates...")
	instanceDirectory := utils.InstanceSlug(release.Meta.Name)
	buildType := c.cfg.BuildType
	if buildType == "" {
		buildType = "client"
	}

	containers := release.Meta.Containers
	localInstance, liErr := c.IM.GetBySlug(instanceDirectory)
	if liErr == nil && len(localInstance.ExtraContainers) > 0 {
		containers = instance.MergeContainers(containers, localInstance.ExtraContainers)
	}

	if err := c.updateInstanceContent(ctx, c.fm.Sub("instances").Sub(instanceDirectory), containers, buildType); err != nil {
		c.l.Error("Update warning: %v", err)
		return fmt.Errorf("failed to update instance: %w", err)
	}

	if ctx.Err() != nil {
		return ctx.Err()
	}

	localInstance, err := c.IM.GetBySlug(instanceDirectory)
	if err != nil {
		return err
	}

	localInstance.Release = &release

	if err := c.IM.Put(localInstance); err != nil {
		return err
	}

	// Step 4: Launch
	onProgress(4, totalSteps, "Запуск Minecraft...")
	c.l.Info("Launching Minecraft!")
	if err := c.mc.Run(ctx, release.Meta.Name, release.Meta.Loader, release.Meta.LoaderVersion, release.Meta.MinecraftVersion, c.cfg.User.UUID, c.cfg.User.Username, c.cfg.User.AuthType == "microsoft"); err != nil {
		return fmt.Errorf("run failed: %w", err)
	}
	return nil
}


func (c *Controller) updateInstanceContent(ctx context.Context, instanceFm file.Manager, releaseContainers []instance.Container, buildType string) error {
	var installedContainers []instance.Container

	instanceFm.ReadJson("installed.json", &installedContainers)

	findInstalled := func(contentType string) instance.Container {
		for _, cont := range installedContainers {
			if cont.ContentType == contentType {
				return cont
			}
		}
		return instance.Container{ContentType: contentType, Content: []instance.Content{}}
	}

	for _, newContainer := range releaseContainers {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		oldContainer := findInstalled(newContainer.ContentType)
		
		processor := updater.NewContentProcessor(newContainer, oldContainer, instanceFm, buildType, c.l)
		if err := processor.Process(ctx); err != nil {
			return err
		}
	}

	if err := instanceFm.SaveJson("installed.json", releaseContainers); err != nil {
		return err
	}

	return nil
}

func (c *Controller) ImportInstance(repo string) (instance.LocalInstance, error) {
	remote, err := c.ghClient.GetInstance(repo)
	if err != nil {
		return instance.LocalInstance{}, fmt.Errorf("failed to fetch instance from github: %w", err)
	}
	if len(remote.Releases) == 0 {
		return instance.LocalInstance{}, fmt.Errorf("no releases found for %s", repo)
	}

	slug := utils.InstanceSlug(remote.Releases[0].Meta.Name)
	remote.Repo = repo
	remote.Slug = slug

	li := instance.LocalInstance{
		Instance: *remote,
	}

	if err := c.IM.Put(li); err != nil {
		return instance.LocalInstance{}, fmt.Errorf("failed to save instance: %w", err)
	}

	c.l.Info("imported instance %s (%s)", slug, repo)
	return li, nil
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

	mcInstance := mc.New(bin, c.fm.Sub("instances").BasePath(), c.cfg.JVMPath, c.cfg.JVMMinRAM, c.cfg.JVMMaxRAM, c.l)

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
				c.cfg.Save(c.fm)

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

func (c *Controller) ConnectFTP() (*ftp.ServerConn, error) {
	ftpCfg := c.cfg.FTP
	if ftpCfg.Host == "" {
		return nil, fmt.Errorf("FTP host is not configured")
	}
	port := ftpCfg.Port
	if port == 0 {
		port = 21
	}

	addr := fmt.Sprintf("%s:%d", ftpCfg.Host, port)
	c.l.Info("Dialing FTP %s...", addr)
	conn, err := ftp.Dial(addr, ftp.DialWithTimeout(15*time.Second))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to FTP %s: %w", addr, err)
	}

	if err := conn.Login(ftpCfg.User, ftpCfg.Password); err != nil {
		conn.Quit()
		return nil, fmt.Errorf("FTP login failed: %w", err)
	}

	return conn, nil
}

func (c *Controller) DeployToServer(ctx context.Context, release instance.Release, onProgress func(step, total int, label string)) error {
	const totalSteps = 3

	onProgress(1, totalSteps, "Подключение к FTP серверу...")
	c.l.Info("Connecting to FTP server...")

	conn, err := c.ConnectFTP()
	if err != nil {
		return fmt.Errorf("FTP connection failed: %w", err)
	}
	defer conn.Quit()

	rootPath := c.cfg.FTP.RootPath
	if rootPath == "" {
		rootPath = "/"
	}

	ftpBackend := file.NewFtpBackend(rootPath, conn)
	fm := file.NewManager(ftpBackend)

	onProgress(2, totalSteps, "Обновление контента на сервере...")
	c.l.Info("Deploying server content...")

	var installedContainers []instance.Container
	_ = fm.ReadJson("installed.json", &installedContainers)

	findInstalled := func(contentType string) instance.Container {
		for _, cont := range installedContainers {
			if cont.ContentType == contentType {
				return cont
			}
		}
		return instance.Container{ContentType: contentType, Content: []instance.Content{}}
	}

	for _, newContainer := range release.Meta.Containers {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		oldContainer := findInstalled(newContainer.ContentType)
		processor := updater.NewContentProcessor(newContainer, oldContainer, fm, "server", c.l)
		if err := processor.Process(ctx); err != nil {
			return fmt.Errorf("deploy failed for %s: %w", newContainer.ContentType, err)
		}
	}

	onProgress(3, totalSteps, "Сохранение информации...")
	if err := fm.SaveJson("installed.json", release.Meta.Containers); err != nil {
		return fmt.Errorf("failed to save installed.json on server: %w", err)
	}

	c.l.Info("Server deploy complete!")
	return nil
}