package main

import (
	"Cubify/internal/config"
	"Cubify/internal/controller"
	"Cubify/internal/git"
	"Cubify/internal/instance"
	logger "Cubify/internal/logging"
	"Cubify/internal/platform"
	"context"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	l               *logger.Logger
	ctx             context.Context
	cfg             *config.Config
	controller      *controller.Controller
	instances       []instance.Instance
	platformManager *platform.Manager

	runMu        sync.Mutex
	runCancel    context.CancelFunc
	deployMu     sync.Mutex
	deployCancel context.CancelFunc
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.l = logger.New(ctx)
	a.cfg, _ = config.Load("config.json")
	a.controller = controller.New(a.cfg, a.l)
	a.platformManager = platform.NewManager(a.cfg.CurseForgeAPIKey)
}

func (a *App) shutdown(ctx context.Context) {
	a.cfg.Save("config.json")
}

// --- Instance operations ---

func (a *App) FetchInstances() []instance.Instance {
	fetchedInstances, err := a.controller.Fetch()
	if err != nil {
		a.l.Error("Error while fetch instances: %v", err)
		return a.instances
	}
	finalInstances := []instance.Instance{}
	for _, inst := range fetchedInstances {
		if len(inst.Releases) > 0 {
			finalInstances = append(finalInstances, inst)
		}
	}
	a.instances = finalInstances
	return a.instances
}

func (a *App) GetInstances() []instance.Instance {
	return a.instances
}

func (a *App) GetLocalInstances() ([]instance.LocalInstance, error) {
	return a.controller.IM.List()
}

func (a *App) Run(release instance.Release) {
	a.runMu.Lock()
	if a.runCancel != nil {
		a.runCancel()
	}
	runCtx, cancel := context.WithCancel(a.ctx)
	a.runCancel = cancel
	a.runMu.Unlock()

	defer func() {
		a.runMu.Lock()
		a.runCancel = nil
		a.runMu.Unlock()
	}()

	onProgress := func(step, total int, label string) {
		runtime.EventsEmit(a.ctx, "run:progress", map[string]interface{}{
			"step":  step,
			"total": total,
			"label": label,
		})
	}

	if err := a.controller.Run(runCtx, release, onProgress); err != nil {
		if runCtx.Err() != nil {
			a.l.Info("Run cancelled")
			runtime.EventsEmit(a.ctx, "run:cancelled", nil)
			return
		}
		a.l.Error("Error while running: %v", err)
		runtime.EventsEmit(a.ctx, "run:error", err.Error())
		return
	}
	runtime.EventsEmit(a.ctx, "run:done", nil)
}

func (a *App) CancelRun() {
	a.runMu.Lock()
	defer a.runMu.Unlock()
	if a.runCancel != nil {
		a.runCancel()
	}
}

func (a *App) DeployToServer(release instance.Release) {
	a.deployMu.Lock()
	if a.deployCancel != nil {
		a.deployCancel()
	}
	deployCtx, cancel := context.WithCancel(a.ctx)
	a.deployCancel = cancel
	a.deployMu.Unlock()

	defer func() {
		a.deployMu.Lock()
		a.deployCancel = nil
		a.deployMu.Unlock()
	}()

	onProgress := func(step, total int, label string) {
		runtime.EventsEmit(a.ctx, "deploy:progress", map[string]interface{}{
			"step":  step,
			"total": total,
			"label": label,
		})
	}

	if err := a.controller.DeployToServer(deployCtx, release, onProgress); err != nil {
		if deployCtx.Err() != nil {
			a.l.Info("Deploy cancelled")
			runtime.EventsEmit(a.ctx, "deploy:cancelled", nil)
			return
		}
		a.l.Error("Error while deploying: %v", err)
		runtime.EventsEmit(a.ctx, "deploy:error", err.Error())
		return
	}
	runtime.EventsEmit(a.ctx, "deploy:done", nil)
}

func (a *App) CancelDeploy() {
	a.deployMu.Lock()
	defer a.deployMu.Unlock()
	if a.deployCancel != nil {
		a.deployCancel()
	}
}

// --- Project / Editor operations ---

func (a *App) CreateProject(project instance.ProjectSettings) (instance.LocalInstance, error) {
	return a.controller.IM.CreateProject(project)
}

func (a *App) HasEditor(slug string) bool {
	return a.controller.IM.HasEditor(slug)
}

func (a *App) CloneProject(slug string) error {
	return a.controller.IM.CloneProject(slug)
}

func (a *App) SaveProjectMeta(slug string, meta instance.Meta) error {
	return a.controller.IM.SaveProject(slug, meta)
}

func (a *App) LoadProjectMeta(slug string) (instance.Meta, error) {
	return a.controller.IM.LoadProject(slug)
}

func (a *App) SyncProject(slug, message string) error {
	return a.controller.IM.SyncProject(slug, message)
}

func (a *App) ReleaseProject(slug, tagName string) error {
	return a.controller.IM.ReleaseProject(slug, tagName)
}

func (a *App) GetProjectHistory(slug string) (*git.GitHistory, error) {
	return a.controller.IM.GetGitHistory(slug)
}

func (a *App) CheckProjectStatus(slug string) (bool, error) {
	return a.controller.IM.GetGitStatus(slug)
}

func (a *App) RefreshLocalReleases() error {
	return a.controller.RefreshLocalReleases()
}

func (a *App) ImportInstance(repo string) (instance.LocalInstance, error) {
	return a.controller.ImportInstance(repo)
}

func (a *App) DeleteInstance(slug string) error {
	return a.controller.IM.Delete(slug)
}

// --- Config ---

func (a *App) GetConfig() config.Config {
	return *a.cfg
}

func (a *App) SaveConfig(cfg config.Config) {
	a.cfg = &cfg
	a.cfg.Save("config.json")
}

// --- Auth ---

func (a *App) StartMicrosoftLogin() {
	if err := a.controller.StartMicrosoftLogin(a.ctx); err != nil {
		a.l.Error("Error while starting login: %v", err)
	}
}

// --- UI helpers ---

func (a *App) SelectLogoFile() (string, error) {
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Выберите логотип",
		Filters: []runtime.FileFilter{
			{DisplayName: "Images", Pattern: "*.png;*.jpg;*.jpeg"},
		},
	})
}

// --- Platform lookups ---

func (a *App) GetContentFromURL(url string) (instance.Content, error) {
	data, err := a.platformManager.GetModFromURL(a.ctx, url)
	if err != nil {
		a.l.Error("%v", err)
	}
	return data, err
}

func (a *App) GetContentSiteURL(source string, modID string) (string, error) {
	return a.platformManager.GetContentSiteURL(instance.Source(source), modID)
}

func (a *App) GetContentVersionURL(source string, modID string, fileID string) (string, error) {
	return a.platformManager.GetContentVersionURL(instance.Source(source), modID, fileID)
}

func (a *App) GetContentVersionsURL(source string, modID string) (string, error) {
	return a.platformManager.GetContentVersionsURL(instance.Source(source), modID)
}