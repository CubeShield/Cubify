package main

import (
	"Cubify/internal/config"
	"Cubify/internal/github"
	"context"
	"fmt"
)

type App struct {
	ctx context.Context
	cfg *config.Config
	ghClient *github.Client
	
	index *github.Index
	instances []github.Instance

}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.cfg, _ = config.Load("config.json")
	a.ghClient = github.New(a.cfg.BaseURL)

	index, err := a.ghClient.GetIndex(a.cfg.IndexURL)
	if err != nil {
		panic(err) 
	}
	a.index = index

	instances := []github.Instance{}
	for _, instanceRepo := range a.index.Instances {
		instance, err := a.ghClient.GetInstance(instanceRepo)
		if err != nil {
			continue
		}

		instances = append(instances, *instance)
	}
	a.instances = instances
	fmt.Println(instances)
}

func (a *App) shutdown(ctx context.Context) {
	a.cfg.Save("config.json")
}

func (a *App) GetInstances() []github.Instance {
	return a.instances
}
