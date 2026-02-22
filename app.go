package main

import (
	"Cubify/internal/config"
	"Cubify/internal/controller"
	"Cubify/internal/github"
	logger "Cubify/internal/logging"
	"context"
)

type App struct {
	l *logger.Logger
	ctx context.Context
	cfg *config.Config
	controller *controller.Controller
	
	instances []github.Instance

}

func NewApp() *App {
	return &App{
		l: logger.New(func (v string) {}),
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.cfg, _ = config.Load("config.json")
	a.controller = controller.New(a.cfg, a.l)
}

func (a *App) shutdown(ctx context.Context) {
	a.cfg.Save("config.json")
}

func (a *App) FetchInstances() []github.Instance {
	instances, err := a.controller.Fetch()
	if err != nil {
		a.l.Error("Error while fetch instances: %v", err)
		return a.instances
	}
	a.instances = instances
	return a.instances
}

func (a *App) GetInstances() []github.Instance {
	return a.instances
}

func (a *App) GetConfig() config.Config {
	return *a.cfg
}

func (a *App) SaveConfig(cfg config.Config) {
	a.cfg = &cfg
	a.cfg.Save("config.json")
}

func (a *App) StartMicrosoftLogin() {
	if err := a.controller.StartMicrosoftLogin(a.ctx); err != nil {
		
	}
}

func (a *App) Run(release github.Release) {
	if err := a.controller.Run(release); err != nil {
		a.l.Error("Error while fetch instances: %v", err)
	}
}