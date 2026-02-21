package controller

import (
	"Cubify/internal/config"
	"Cubify/internal/github"
)



type Controller struct {
	cfg *config.Config
	ghClient *github.Client
}

func New(cfg *config.Config) *Controller {
	return &Controller{
		cfg: cfg,
		ghClient: github.New(cfg.BaseURL),
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
			continue
		}

		instances = append(instances, *instance)
	}

	return instances, nil
}