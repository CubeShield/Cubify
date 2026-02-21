package main

import (
	"Cubify/internal/config"
	"Cubify/internal/controller"
	"Cubify/internal/github"
	"context"
	"log"
)

type App struct {
	ctx context.Context
	cfg *config.Config
	controller *controller.Controller
	
	instances []github.Instance

}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.cfg, _ = config.Load("config.json")
	a.controller = controller.New(a.cfg)
}

func (a *App) shutdown(ctx context.Context) {
	a.cfg.Save("config.json")
}

func (a *App) FetchInstances() []github.Instance {
	instances, err := a.controller.Fetch()
	if err != nil {
		log.Printf("Error while fetch instances: %v", err)
		return a.instances
	}
	log.Printf("Fetched!")
	a.instances = instances
	log.Println(instances)
	return a.instances
}

func (a *App) GetInstances() []github.Instance {
	return a.instances
}
