package controller

import (
	"Cubify/internal/cache"
	"Cubify/internal/config"
	"Cubify/internal/github"
	"Cubify/internal/installer"
	"Cubify/internal/mc"
	"log"
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
	c.mc.Prepare(release.Meta.Name, release.Meta.MinecraftVersion)
	return nil
}