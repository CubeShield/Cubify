package platform

import (
	"Cubify/internal/github"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type modrinthVersion struct {
	Name      string         `json:"name"`
	Version   string         `json:"version_number"`
	ProjectID string         `json:"project_id"`
	Files     []modrinthFile `json:"files"`
}

type modrinthFile struct {
	Hashes   map[string]string `json:"hashes"`
	Url      string            `json:"url"`
	Filename string            `json:"filename"`
	Primary  bool              `json:"primary"`
}

type modrinthProject struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	IconUrl     string `json:"icon_url"`
	Id          string `json:"id"`
	Slug        string `json:"slug"`
}

type ModrinthService struct {
	httpClient *http.Client
}

func NewModrinthService() Service {
	return &ModrinthService{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// Пример: https://modrinth.com/mod/sodium/version/mc1.21.11-0.8.4-neoforge
func (s *ModrinthService) ParseURL(ctx context.Context, url string) (modID, fileID string, err error) {
	cleanUrl := strings.Split(url, "?")[0]
	
	// Варианты ссылок:
	// https://modrinth.com/mod/sodium/version/mc1.20.1-0.5.3
	// https://modrinth.com/plugin/carbon/version/1.0.0
	// https://modrinth.com/resourcepack/my-pack/version/1.0

	parts := strings.Split(cleanUrl, "/")
	
	var modIndex, verIndex int
	for i, p := range parts {
		if p == "mod" || p == "plugin" || p == "resourcepack" {
			modIndex = i
		}
		if p == "version" {
			verIndex = i
		}
	}

	if modIndex > 0 && modIndex+1 < len(parts) {
		modID = parts[modIndex+1]
	}
	if verIndex > 0 && verIndex+1 < len(parts) {
		fileID = parts[verIndex+1]
	}

	if modID == "" || fileID == "" {
		return "", "", fmt.Errorf("invalid modrinth url format")
	}

	return modID, fileID, nil
}

func (s *ModrinthService) GetMod(ctx context.Context, modID, fileID string) (github.Content, error) {
	versionUrl := fmt.Sprintf("https://api.modrinth.com/v2/project/%s/version/%s", modID, fileID)
	
	var versionData modrinthVersion
	if err := s.fetchJSON(ctx, versionUrl, &versionData); err != nil {
		return github.Content{}, fmt.Errorf("failed to fetch version: %w", err)
	}

	projectUrl := fmt.Sprintf("https://api.modrinth.com/v2/project/%s", versionData.ProjectID)
	
	var projectData modrinthProject
	if err := s.fetchJSON(ctx, projectUrl, &projectData); err != nil {
		fmt.Printf("Warning: failed to fetch project info: %v\n", err)
		projectData.Title = modID
	}

	var targetFile modrinthFile
	found := false
	
	for _, f := range versionData.Files {
		if f.Primary {
			targetFile = f
			found = true
			break
		}
	}
	
	if !found && len(versionData.Files) > 0 {
		targetFile = versionData.Files[0]
		found = true
	}

	if !found {
		return github.Content{}, fmt.Errorf("no files found in this version")
	}

	return github.Content{
		Name:     projectData.Title,
		ImageURL: projectData.IconUrl,
		Type:     github.TypeBoth,
		ModID:    modID,
		FileID:   fileID,
		Source:   github.SourceModrinth,
		File:     targetFile.Filename,
		Url:      targetFile.Url,
	}, nil
}

func (s *ModrinthService) fetchJSON(ctx context.Context, url string, target interface{}) error {
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return err
	}
	
	req.Header.Set("User-Agent", "Cubify/Launcher/1.0 (launcher@cubify.app)")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("api returned status: %s", resp.Status)
	}

	return json.NewDecoder(resp.Body).Decode(target)
}