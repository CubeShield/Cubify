package main

import (
	"Cubify/internal/config"
	"Cubify/internal/controller"
	"Cubify/internal/editor"
	"Cubify/internal/instance"
	logger "Cubify/internal/logging"
	"Cubify/internal/platform"
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type App struct {
	l *logger.Logger
	ctx context.Context
	cfg *config.Config
	controller *controller.Controller
	editorManager *editor.Manager
	instances []instance.Instance
	platformManager *platform.Manager

}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.l = logger.New(ctx)
	a.cfg, _ = config.Load("config.json")
	a.editorManager = editor.New(a.cfg.EditorDirectory)
	a.controller = controller.New(a.cfg, a.l)
	a.platformManager = platform.NewManager(a.cfg.CurseForgeAPIKey)
}

func (a *App) shutdown(ctx context.Context) {
	a.cfg.Save("config.json")
}


func (a *App) CreateProject(name, desc, mcVer, loader, loaderVer, repoLink, logoPath string) (string, error) {
	s, err := a.editorManager.CreateProject(name, desc, mcVer, loader, loaderVer, repoLink, logoPath)
	if err != nil {
		a.l.Error("%s: %v", s, err)
	}
    return s, err
}

func (a *App) SaveProjectMeta(path string, meta instance.Meta) error {
    return a.editorManager.SaveInstance(path, meta)
}

func (a *App) LoadProjectMeta(path string) (instance.Meta, error) {
    meta, err := a.editorManager.LoadProject(path)
    if err != nil { return instance.Meta{}, err }
    return *meta, nil
}

func (a *App) SyncProject(path string, message string) error {
    return a.editorManager.GitPush(path, message)
}

func (a *App) ReleaseProject(path string, tagName string) error {
    return a.editorManager.GitRelease(path, tagName)
}

func (a *App) SelectLogoFile() (string, error) {
    return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
        Title: "Выберите логотип",
        Filters: []runtime.FileFilter{
            {DisplayName: "Images", Pattern: "*.png;*.jpg;*.jpeg"},
        },
    })
}

func (a *App) FetchInstances() []instance.Instance {
	fetchedInstances, err := a.controller.Fetch()
	if err != nil {
		a.l.Error("Error while fetch instances: %v", err)
		return a.instances
	}
	finalInstances := []instance.Instance{}
	for _, instance := range fetchedInstances {
		if len(instance.Releases) > 0 {
			finalInstances = append(finalInstances, instance)
		}
	}
	a.instances = finalInstances
	return a.instances
}

func (a *App) GetInstances() []instance.Instance {
	return a.instances
}

func (a *App) GetLocalInstances() ([]instance.LocalInstance, error) {
	return a.controller.List()
}

func (a *App) GetConfig() config.Config {
	return *a.cfg
}

func (a *App) SaveConfig(cfg config.Config) {
	a.cfg = &cfg
	a.cfg.Save("config.json")
}

func (a *App) FetchLocalProjects() []instance.Project {
	projects, err := a.editorManager.ListProjects()
	if err != nil {
		a.l.Error("Failed to list projects: %v", err)
		return []instance.Project{}
	}
	return projects
}

func (a *App) GetProjectHistory(path string) (*editor.GitHistory, error) {
	return a.editorManager.GetGitHistory(path)
}

func (a *App) CheckProjectStatus(path string) (bool, error) {
    return a.editorManager.GetGitStatus(path)
}

func (a *App) StartMicrosoftLogin() {
	if err := a.controller.StartMicrosoftLogin(a.ctx); err != nil {
		
	}
}

func (a *App) Run(release instance.Release) {
	if err := a.controller.Run(release); err != nil {
		a.l.Error("Error while fetch instances: %v", err)
	}
}

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