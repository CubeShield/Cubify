package editor

import (
	"Cubify/internal/github"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const ReleaseWorkflow = `name: Release Modpack

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Create Release & Upload Assets
        uses: softprops/action-gh-release@v2
        with:
          files: |
            instance.json
          generate_release_notes: true
          draft: false
          prerelease: false
`

type Manager struct {
	ProjectsDir string
}

func New(projectsDir string) *Manager {
	_ = os.MkdirAll(projectsDir, 0755)
	return &Manager{ProjectsDir: projectsDir}
}

func (m *Manager) CreateProject(name, desc, mcVer, loader, loaderVer, repoLink, logoPath string) (string, error) {
	parts := strings.Split(repoLink, "/")
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid repo format, use 'owner/repo'")
	}
	owner, repo := parts[0], parts[1]

	projectPath := filepath.Join(m.ProjectsDir, name)
	if err := os.MkdirAll(projectPath, 0755); err != nil {
		return "", err
	}

	destLogo := filepath.Join(projectPath, "logo.png")
	if err := copyFile(logoPath, destLogo); err != nil {
		return "", fmt.Errorf("failed to copy logo: %w", err)
	}

	rawImgUrl := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/main/logo.png", owner, repo)

	meta := github.Meta{
		Name:             name,
		Description:      desc,
		MinecraftVersion: mcVer,
		Loader:           loader,
		LoaderVersion:    loaderVer,
		ImageURL:         rawImgUrl,
		Containers:       []github.Container{},
	}
	if err := saveJSON(filepath.Join(projectPath, "instance.json"), meta); err != nil {
		return "", err
	}

	workflowsDir := filepath.Join(projectPath, ".github", "workflows")
	if err := os.MkdirAll(workflowsDir, 0755); err != nil {
		return "", err
	}
	if err := os.WriteFile(filepath.Join(workflowsDir, "release.yml"), []byte(ReleaseWorkflow), 0644); err != nil {
		return "", err
	}
	
	
	remoteURL := fmt.Sprintf("git@github.com:%s/%s.git", owner, repo)
	if err := runGit(projectPath, "init"); err != nil { return "", err }
	

	_ = runGit(projectPath, "branch", "-M", "main") 
	if err := runGit(projectPath, "remote", "add", "origin", remoteURL); err != nil {
		return "", err 
	}
	

	if err := runGit(projectPath, "add", "."); err != nil {
		return "", err
	}
	if err := runGit(projectPath, "commit", "-m", "Initial commit by Cubify"); err != nil {
		return "", err
	}

	if err := runGit(projectPath, "push", "-u", "origin", "main"); err != nil {
		return "", err
	}
	
	return projectPath, nil
}

// SaveInstance обновляет instance.json
func (m *Manager) SaveInstance(projectPath string, meta github.Meta) error {
	return saveJSON(filepath.Join(projectPath, "instance.json"), meta)
}

// GitOperations
func (m *Manager) GitPush(projectPath, message string) error {
	if err := runGit(projectPath, "add", "."); err != nil { return err }
	if err := runGit(projectPath, "commit", "-m", message); err != nil { return err }
	return runGit(projectPath, "push", "-u", "origin", "main")
}

func (m *Manager) GitRelease(projectPath, tagName string) error {
	// Создаем тег
	if err := runGit(projectPath, "tag", tagName); err != nil { return err }
	// Пушим тег
	return runGit(projectPath, "push", "origin", tagName)
}

// Вспомогательные функции
func runGit(dir string, args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	// Можно перенаправить вывод, если нужно дебажить
	// cmd.Stdout = os.Stdout
	// cmd.Stderr = os.Stderr
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("git %s failed: %s, output: %s", args[0], err, string(output))
	}
	return nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil { return err }
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil { return err }
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

func saveJSON(path string, data interface{}) error {
	bytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil { return err }
	return os.WriteFile(path, bytes, 0644)
}

// LoadProject читает instance.json из папки
func (m *Manager) LoadProject(path string) (*github.Meta, error) {
	bytes, err := os.ReadFile(filepath.Join(path, "instance.json"))
	if err != nil { return nil, err }
	var meta github.Meta
	if err := json.Unmarshal(bytes, &meta); err != nil { return nil, err }
	return &meta, nil
}