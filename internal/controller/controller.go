package controller

import (
	"Cubify/internal/cache"
	"Cubify/internal/config"
	"Cubify/internal/github"
	"log"
)



type Controller struct {
	cfg *config.Config
	ghClient *github.Client
	cm *cache.CacheManager
}

func New(cfg *config.Config) *Controller {
	return &Controller{
		cfg: cfg,
		ghClient: github.New(cfg.BaseURL, cfg.AuthToken),
		cm: cache.New(),
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