package controller

import (
	"Cubify/internal/cache"
	"Cubify/internal/config"
	"Cubify/internal/filesystem"
	"Cubify/internal/github"
	"Cubify/internal/installer"
	"Cubify/internal/mc"
	"Cubify/internal/updater"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
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

func getInstanceDirectoryName(instanceName string) string {
	return strings.ReplaceAll(strings.ReplaceAll(instanceName, ":", ""), " ", "-")
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
	log.Println("Preparing minecraft...")
	c.mc.Prepare(release.Meta.Name, release.Meta.Loader, release.Meta.LoaderVersion, release.Meta.MinecraftVersion)
	log.Println("Checking for updates...")
	instanceDirectory := getInstanceDirectoryName(release.Meta.Name)
	fullInstancePath := filepath.Join(c.cfg.InstancesDirectory, instanceDirectory)
	if err := c.updateInstanceContent(fullInstancePath, release.Meta.Containers); err != nil {
		log.Printf("Update warning: %v", err)
		return fmt.Errorf("failed to update instance: %w", err)
	}
	
	log.Println("Launch minecraft...")
	c.mc.Run(release.Meta.Name, release.Meta.Loader, release.Meta.LoaderVersion, release.Meta.MinecraftVersion, c.cfg.User.UUID, c.cfg.Nickname)
	return nil
}


func (c *Controller) updateInstanceContent(instancePath string, releaseContainers []github.Container) error {
	fm, _ := filesystem.NewFileManager(instancePath)
	installedJSONPath := filepath.Join(instancePath, "installed.json")

	var installedContainers []github.Container
	if data, err := os.ReadFile(installedJSONPath); err == nil {
		_ = json.Unmarshal(data, &installedContainers)
	}

	findInstalled := func(contentType string) github.Container {
		for _, cont := range installedContainers {
			if cont.ContentType == contentType {
				return cont
			}
		}
		return github.Container{ContentType: contentType, Content: []github.Content{}}
	}

	for _, newContainer := range releaseContainers {
		oldContainer := findInstalled(newContainer.ContentType)
		
		processor := updater.NewContentProcessor(newContainer, oldContainer, fm)
		if err := processor.Process(); err != nil {
			return err
		}
	}

	newData, err := json.MarshalIndent(releaseContainers, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal installed state: %w", err)
	}

	if err := os.WriteFile(installedJSONPath, newData, 0644); err != nil {
		return fmt.Errorf("failed to save installed.json: %w", err)
	}

	return nil
}

func (c *Controller) StartMicrosoftLogin(ctx context.Context) error {
	if err := c.installer.RetrievePortableMC(); err != nil {
		return err
	}

	bin := c.installer.GetExecutablePath()

	mcInstance := mc.New(bin, c.cfg.InstancesDirectory)

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
				c.cfg.Save("config.json")

				runtime.EventsEmit(ctx, "auth:success", map[string]string{
					"username": username,
					"uuid":     uuid,
				})
			},
		)

		if err != nil {
			log.Printf("Auth error: %v", err)
			runtime.EventsEmit(ctx, "auth:error", err.Error())
		}
	}()
	return nil
}