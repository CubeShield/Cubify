package instance

import (
	"Cubify/internal/file"
	"Cubify/internal/git"
	"Cubify/internal/utils"
	"fmt"
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

type ProjectManager struct {
	fm file.Manager
	gm *git.Manager
}

func NewProjectManager(fm file.Manager) *ProjectManager {
	return &ProjectManager{
		fm: fm,
		gm: git.New(),
	}
}

type ProjectSettings struct {
	Name string
	Description string
	MinecraftVersion string
	Loader string
	LoaderVersion string
	RepoLink string
	LogoPath string
}

func (pm *ProjectManager) Create(p ProjectSettings) error {
	parts := strings.Split(p.RepoLink, "/")
	if len(parts) != 2 {
		return fmt.Errorf("invalid repo format, use 'owner/repo'")
	}
	owner, repo := parts[0], parts[1]

	projectPath := filepath.Join(utils.InstanceSlug(p.Name), "editor") 

	//destLogo := filepath.Join(slug, "logo.png")
	//if err := copyFile(logoPath, destLogo); err != nil {
	//	return "", fmt.Errorf("failed to copy logo: %w", err)
	//}

	rawImgUrl := fmt.Sprintf("https://raw.instanceusercontent.com/%s/%s/main/logo.png", owner, repo)

	meta := Meta{
		Name:             p.Name,
		Description:      p.Description,
		MinecraftVersion: p.MinecraftVersion,
		Loader:           p.Loader,
		LoaderVersion:    p.LoaderVersion,
		ImageURL:         rawImgUrl,
		Containers:       []Container{},
	}
	if err := pm.fm.SaveJson(filepath.Join(projectPath, "instance.json"), meta); err != nil {
		return err
	}

	if err := pm.fm.Save(filepath.Join(projectPath, ".github", "workflows", "release.yml"), strings.NewReader(ReleaseWorkflow)); err != nil {
		return err
	}
	
	
	remoteURL := fmt.Sprintf("git@github.com:%s/%s.git", owner, repo)
	if err := git.Run(projectPath, "init"); err != nil { return err }
	

	_ = git.Run(projectPath, "branch", "-M", "main") 
	if err := git.Run(projectPath, "remote", "add", "origin", remoteURL); err != nil {
		return err 
	}
	

	if err := git.Run(projectPath, "add", "."); err != nil {
		return err
	}
	if err := git.Run(projectPath, "commit", "-m", "Initial commit by Cubify"); err != nil {
		return err
	}

	if err := git.Run(projectPath, "push", "-u", "origin", "main"); err != nil {
		return err
	}
	
	return nil
}

func (pm *ProjectManager) Save(slug string, meta Meta) error {
	return pm.fm.SaveJson(filepath.Join(slug, "editor", "instance.json"), meta)
}


func (pm *ProjectManager) Load(slug string) (Meta, error) {
	var meta Meta
	if err := pm.fm.ReadJson(filepath.Join(slug, "editor", "instance.json"), &meta); err != nil {
		return Meta{}, err
	}

	return meta, nil
}

func (pm *ProjectManager) Commit(slug string, message string) error {
	return pm.gm.GitPush(filepath.Join(slug, "editor"), message)
}

func (pm *ProjectManager) Release(slug string, tagName string) error {
	return pm.gm.GitRelease(filepath.Join(slug, "editor"), tagName)
}

func (pm *ProjectManager) GetGitHistory(slug string) (*git.GitHistory, error) {
	return pm.gm.GetGitHistory(filepath.Join(slug, "editor"))
}

func (pm *ProjectManager) GetGitStatus(slug string) (bool, error) {
	return pm.gm.GetGitStatus(filepath.Join(slug, "editor"))
}