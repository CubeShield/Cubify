package instance

import (
	"Cubify/internal/file"
	"Cubify/internal/git"
	logger "Cubify/internal/logging"
	"Cubify/internal/utils"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Manager struct {
	l                  *logger.Logger
	fm                 file.Manager
	gm                 *git.Manager
	instancesDirectory string
}

func NewManager(l *logger.Logger, fm file.Manager, instancesDirectory string) *Manager {
	return &Manager{
		l:                  l,
		fm:                 fm,
		gm:                 git.New(),
		instancesDirectory: instancesDirectory,
	}
}

func (m *Manager) editorPath(slug string) string {
	return filepath.Join(m.instancesDirectory, slug, "editor")
}

func (m *Manager) HasEditor(slug string) bool {
	return m.fm.Exists(m.editorPath(slug))
}

func (m *Manager) List() ([]LocalInstance, error) {
	installedInstances, err := m.fm.Tree(m.instancesDirectory, 2)
	if err != nil {
		return nil, err
	}

	localInstances := []LocalInstance{}

	for _, ch := range installedInstances.Children {
		if !ch.IsDir {
			continue
		}
		dirName := ch.Name

		var localInstance LocalInstance
		if err := m.fm.ReadJson(filepath.Join(m.instancesDirectory, dirName, "instance.json"), &localInstance); err != nil {
			m.l.Error("Failed to get instance %s: %v", dirName, err)
			continue
		}

		localInstances = append(localInstances, localInstance)
	}

	return localInstances, nil
}

func (m *Manager) GetBySlug(slug string) (LocalInstance, error) {
	var localInstance LocalInstance
	if err := m.fm.ReadJson(filepath.Join(m.instancesDirectory, slug, "instance.json"), &localInstance); err != nil {
		return LocalInstance{}, err
	}
	return localInstance, nil
}

func (m *Manager) Put(localInstance LocalInstance) error {
	return m.fm.SaveJson(filepath.Join(m.instancesDirectory, localInstance.Slug, "instance.json"), localInstance)
}

func (m *Manager) Delete(slug string) error {
	instancePath := filepath.Join(m.instancesDirectory, slug)
	return os.RemoveAll(instancePath)
}

func (m *Manager) SaveProject(slug string, meta Meta) error {
	return m.fm.SaveJson(filepath.Join(m.editorPath(slug), "instance.json"), meta)
}

func (m *Manager) LoadProject(slug string) (Meta, error) {
	var meta Meta
	if err := m.fm.ReadJson(filepath.Join(m.editorPath(slug), "instance.json"), &meta); err != nil {
		return Meta{}, err
	}
	return meta, nil
}

func (m *Manager) SyncProject(slug, message string) error {
	return m.gm.GitPush(m.editorPath(slug), message)
}

func (m *Manager) ReleaseProject(slug, tagName string) error {
	return m.gm.GitRelease(m.editorPath(slug), tagName)
}

func (m *Manager) GetGitHistory(slug string) (*git.GitHistory, error) {
	return m.gm.GetGitHistory(m.editorPath(slug))
}

func (m *Manager) GetGitStatus(slug string) (bool, error) {
	return m.gm.GetGitStatus(m.editorPath(slug))
}

// CloneProject clones the GitHub repo into the editor folder for an existing instance.
func (m *Manager) CloneProject(slug string) error {
	inst, err := m.GetBySlug(slug)
	if err != nil {
		return fmt.Errorf("instance not found: %w", err)
	}
	if inst.Repo == "" {
		return fmt.Errorf("instance has no repo link")
	}
	if m.HasEditor(slug) {
		return fmt.Errorf("editor already exists for %s", slug)
	}

	remoteURL := fmt.Sprintf("https://github.com/%s.git", inst.Repo)
	editorDir := m.editorPath(slug)

	if err := git.Run(".", "clone", remoteURL, editorDir); err != nil {
		return fmt.Errorf("git clone failed: %w", err)
	}
	return nil
}

func (m *Manager) CreateProject(project ProjectSettings) (LocalInstance, error) {
	slug := utils.InstanceSlug(project.Name)
	editorDir := m.editorPath(slug)

	parts := strings.Split(project.RepoLink, "/")
	if len(parts) != 2 {
		return LocalInstance{}, fmt.Errorf("invalid repo format, use 'owner/repo'")
	}
	owner, repo := parts[0], parts[1]

	rawImgUrl := fmt.Sprintf("https://raw.githubusercontent.com/%s/%s/main/logo.png", owner, repo)

	meta := Meta{
		Name:             project.Name,
		Description:      project.Description,
		MinecraftVersion: project.MinecraftVersion,
		Loader:           project.Loader,
		LoaderVersion:    project.LoaderVersion,
		ImageURL:         rawImgUrl,
		Containers:       []Container{},
	}

	if err := m.fm.SaveJson(filepath.Join(editorDir, "instance.json"), meta); err != nil {
		return LocalInstance{}, err
	}

	if err := m.fm.Save(filepath.Join(editorDir, ".github", "workflows", "release.yml"), strings.NewReader(ReleaseWorkflow)); err != nil {
		return LocalInstance{}, err
	}

	if project.LogoPath != "" {
		logoFile, err := os.Open(project.LogoPath)
		if err != nil {
			return LocalInstance{}, fmt.Errorf("failed to open logo: %w", err)
		}
		defer logoFile.Close()

		if err := m.fm.Save(filepath.Join(editorDir, "logo.png"), logoFile); err != nil {
			return LocalInstance{}, fmt.Errorf("failed to save logo: %w", err)
		}
	}

	localInstance := LocalInstance{
		Instance: Instance{
			Repo: project.RepoLink,
			Slug: slug,
			Releases: []Release{
				{
					CreatedAt: time.Now(),
					TagName: "v1.0.0",
					Name: "v1.0.0",
					Meta: meta,
				},
			},
		},
		DevMeta: &meta,
	}

	if err := m.Put(localInstance); err != nil {
		m.l.Error("failed to put instance: %v", err)
		return LocalInstance{}, err
	}

	remoteURL := fmt.Sprintf("git@github.com:%s/%s.git", owner, repo)
	if err := git.Run(editorDir, "init"); err != nil {
		return LocalInstance{}, err
	}
	_ = git.Run(editorDir, "branch", "-M", "main")
	if err := git.Run(editorDir, "remote", "add", "origin", remoteURL); err != nil {
		return LocalInstance{}, err
	}
	if err := git.Run(editorDir, "add", "."); err != nil {
		return LocalInstance{}, err
	}
	if err := git.Run(editorDir, "commit", "-m", "Initial commit by Cubify"); err != nil {
		return LocalInstance{}, err
	}
	if err := git.Run(editorDir, "push", "-u", "origin", "main"); err != nil {
		return LocalInstance{}, err
	}

	if err := m.gm.GitRelease(editorDir, "v1.0.0"); err != nil {
		return LocalInstance{}, err
	}

	return localInstance, nil
}