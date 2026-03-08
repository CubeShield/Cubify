package main

import (
	"Cubify/internal/config"
	"Cubify/internal/controller"
	"Cubify/internal/file"
	"Cubify/internal/git"
	"Cubify/internal/instance"
	logger "Cubify/internal/logging"
	"Cubify/internal/platform"
	"Cubify/internal/utils"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

var Version = "dev"

type App struct {
	l               *logger.Logger
	fm file.Manager
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
	a.fm = file.NewManager(file.NewLocalBackend(utils.GetBaseDir()))
	a.cfg, _ = config.Load(a.fm)
	a.controller = controller.New(a.cfg, a.l, a.fm)
	a.platformManager = platform.NewManager(a.cfg.CurseForgeAPIKey)
}

func (a *App) shutdown(ctx context.Context) {
	a.cfg.Save(a.fm)
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

	go func() {
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
	}()
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

func (a *App) ReleaseProject(slug, tagName, message string) error {
	return a.controller.IM.ReleaseProject(slug, tagName, message)
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
	*a.cfg = cfg
	a.cfg.Save(a.fm)
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

// --- Extra content (user-added) ---

func (a *App) AddExtraContent(slug, contentType string, content instance.Content) error {
	return a.controller.IM.AddExtraContent(slug, contentType, content)
}

func (a *App) AddExtraContentFromFile(slug, contentType string) (instance.Content, error) {
	var filters []runtime.FileFilter
	switch contentType {
	case "resourcepacks":
		filters = []runtime.FileFilter{{DisplayName: "Resource Packs", Pattern: "*.zip"}}
	default:
		filters = []runtime.FileFilter{{DisplayName: "Minecraft Mods", Pattern: "*.jar"}}
	}

	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "Выберите файл",
		Filters: filters,
	})
	if err != nil {
		return instance.Content{}, err
	}
	if path == "" {
		return instance.Content{}, fmt.Errorf("no file selected")
	}

	return a.controller.IM.AddExtraContentFromFile(slug, contentType, path)
}

func (a *App) RemoveExtraContent(slug, contentType, fileName string) error {
	return a.controller.IM.RemoveExtraContent(slug, contentType, fileName)
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

// --- Update check ---

type UpdateInfo struct {
	Available  bool   `json:"available"`
	Version    string `json:"version"`
	CurrentVersion string `json:"current_version"`
	URL        string `json:"url"`
}

type githubRelease struct {
	TagName string `json:"tag_name"`
	HTMLURL string `json:"html_url"`
}

func (a *App) CheckForUpdates() UpdateInfo {
	if Version == "dev" {
		return UpdateInfo{Available: false, CurrentVersion: Version}
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", "https://api.github.com/repos/CubeShield/Cubify/releases/latest", nil)
	if err != nil {
		a.l.Error("Update check: failed to create request: %v", err)
		return UpdateInfo{Available: false, CurrentVersion: Version}
	}
	req.Header.Set("User-Agent", "Cubify-Launcher")
	req.Header.Set("Accept", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		a.l.Error("Update check: request failed: %v", err)
		return UpdateInfo{Available: false, CurrentVersion: Version}
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		a.l.Error("Update check: unexpected status %d", resp.StatusCode)
		return UpdateInfo{Available: false, CurrentVersion: Version}
	}

	var release githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&release); err != nil {
		a.l.Error("Update check: decode error: %v", err)
		return UpdateInfo{Available: false, CurrentVersion: Version}
	}

	latestTag := strings.TrimPrefix(release.TagName, "v")
	currentTag := strings.TrimPrefix(Version, "v")

	if latestTag != currentTag {
		return UpdateInfo{
			Available:      true,
			Version:        release.TagName,
			CurrentVersion: Version,
			URL:            release.HTMLURL,
		}
	}

	return UpdateInfo{Available: false, CurrentVersion: Version}
}

func (a *App) GetVersion() string {
	return Version
}