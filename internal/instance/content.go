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
}

func NewManager(l *logger.Logger, fm file.Manager) *Manager {
	return &Manager{
		l:                  l,
		fm:                 fm,
		gm:                 git.New(),
	}
}

func (m *Manager) editorPath(slug string) string {
	return filepath.Join( slug, "editor")
}

func (m *Manager) absPath(rel string) string {
	return filepath.Join(m.fm.BasePath(), rel)
}

func (m *Manager) HasEditor(slug string) bool {
	return m.fm.Exists(m.editorPath(slug))
}

func (m *Manager) List() ([]LocalInstance, error) {
	installedInstances, err := m.fm.Tree("", 2)
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
		if err := m.fm.ReadJson(filepath.Join( dirName, "instance.json"), &localInstance); err != nil {
			m.l.Error("Failed to get instance %s: %v", dirName, err)
			continue
		}

		localInstances = append(localInstances, localInstance)
	}

	return localInstances, nil
}

func (m *Manager) GetBySlug(slug string) (LocalInstance, error) {
	var localInstance LocalInstance
	if err := m.fm.ReadJson(filepath.Join(slug, "instance.json"), &localInstance); err != nil {
		return LocalInstance{}, err
	}
	return localInstance, nil
}

func (m *Manager) Put(localInstance LocalInstance) error {
	return m.fm.SaveJson(filepath.Join( localInstance.Slug, "instance.json"), localInstance)
}

func (m *Manager) Delete(slug string) error {
	return os.RemoveAll(m.absPath(slug))
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
	return m.gm.GitPush(m.absPath(m.editorPath(slug)), message)
}

func (m *Manager) ReleaseProject(slug, tagName, message string) error {
	editorDir := m.editorPath(slug)
	absDir := m.absPath(editorDir)

	// Write release message file
	msgRelPath := filepath.Join(editorDir, "release_message.txt")
	if message != "" {
		if err := m.fm.Save(msgRelPath, strings.NewReader(message)); err != nil {
			return fmt.Errorf("failed to write release message: %w", err)
		}
	} else {
		if err := m.fm.Save(msgRelPath, strings.NewReader("")); err != nil {
			return fmt.Errorf("failed to write release message: %w", err)
		}
	}

	// Stage the message file, commit, push, then tag
	_ = git.Run(absDir, "add", "release_message.txt")
	_ = git.Run(absDir, "commit", "-m", fmt.Sprintf("release: %s", tagName))
	_ = git.Run(absDir, "push", "origin", "main")

	return m.gm.GitRelease(absDir, tagName)
}

func (m *Manager) GetGitHistory(slug string) (*git.GitHistory, error) {
	return m.gm.GetGitHistory(m.absPath(m.editorPath(slug)))
}

func (m *Manager) GetGitStatus(slug string) (bool, error) {
	return m.gm.GetGitStatus(m.absPath(m.editorPath(slug)))
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

	remoteURL := fmt.Sprintf("git@github.com:%s.git", inst.Repo)
	absDir := m.absPath(m.editorPath(slug))

	if err := git.Run(".", "clone", remoteURL, absDir); err != nil {
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
	absDir := m.absPath(editorDir)
	if err := git.Run(absDir, "init"); err != nil {
		return LocalInstance{}, err
	}
	_ = git.Run(absDir, "branch", "-M", "main")
	if err := git.Run(absDir, "remote", "add", "origin", remoteURL); err != nil {
		return LocalInstance{}, err
	}
	if err := git.Run(absDir, "add", "."); err != nil {
		return LocalInstance{}, err
	}
	if err := git.Run(absDir, "commit", "-m", "Initial commit by Cubify"); err != nil {
		return LocalInstance{}, err
	}
	if err := git.Run(absDir, "push", "-u", "origin", "main"); err != nil {
		return LocalInstance{}, err
	}

	if err := m.gm.GitRelease(absDir, "v1.0.0"); err != nil {
		return LocalInstance{}, err
	}

	return localInstance, nil
}

// ── Project content (editor, git-tracked) ──

func (m *Manager) AddProjectContentFromFile(slug, contentType, filePath string) (Content, error) {
	filename := filepath.Base(filePath)
	nameNoExt := strings.TrimSuffix(filename, filepath.Ext(filename))

	src, err := os.Open(filePath)
	if err != nil {
		return Content{}, fmt.Errorf("failed to open source file: %w", err)
	}
	defer src.Close()

	destRelPath := filepath.Join(m.editorPath(slug), contentType, filename)
	if err := m.fm.Save(destRelPath, src); err != nil {
		return Content{}, fmt.Errorf("failed to save file: %w", err)
	}

	content := Content{
		Name:   nameNoExt,
		Type:   TypeBoth,
		Source: SourceLocal,
		File:   filename,
	}

	return content, nil
}

// ── Extra content (user-added mods/resourcepacks) ──

func (m *Manager) AddExtraContent(slug, contentType string, content Content) error {
	inst, err := m.GetBySlug(slug)
	if err != nil {
		return fmt.Errorf("instance not found: %w", err)
	}

	found := false
	for i, c := range inst.ExtraContainers {
		if c.ContentType == contentType {
			inst.ExtraContainers[i].Content = append(inst.ExtraContainers[i].Content, content)
			found = true
			break
		}
	}
	if !found {
		inst.ExtraContainers = append(inst.ExtraContainers, Container{
			ContentType: contentType,
			Content:     []Content{content},
		})
	}

	return m.Put(inst)
}

func (m *Manager) AddExtraContentFromFile(slug, contentType, filePath string) (Content, error) {
	filename := filepath.Base(filePath)
	nameNoExt := strings.TrimSuffix(filename, filepath.Ext(filename))

	src, err := os.Open(filePath)
	if err != nil {
		return Content{}, fmt.Errorf("failed to open source file: %w", err)
	}
	defer src.Close()

	destRelPath := filepath.Join(slug, contentType, fmt.Sprintf("[Cubify] %s", filename))
	if err := m.fm.Save(destRelPath, src); err != nil {
		return Content{}, fmt.Errorf("failed to save file: %w", err)
	}

	content := Content{
		Name:   nameNoExt,
		Type:   TypeBoth,
		Source: SourceLocal,
		File:   filename,
	}

	if err := m.AddExtraContent(slug, contentType, content); err != nil {
		return Content{}, err
	}

	return content, nil
}

func (m *Manager) RemoveExtraContent(slug, contentType, fileName string) error {
	inst, err := m.GetBySlug(slug)
	if err != nil {
		return fmt.Errorf("instance not found: %w", err)
	}

	for i, c := range inst.ExtraContainers {
		if c.ContentType == contentType {
			newContent := []Content{}
			for _, item := range c.Content {
				if item.File != fileName {
					newContent = append(newContent, item)
				}
			}
			if len(newContent) == 0 {
				inst.ExtraContainers = append(inst.ExtraContainers[:i], inst.ExtraContainers[i+1:]...)
			} else {
				inst.ExtraContainers[i].Content = newContent
			}
			break
		}
	}

	// Delete physical file
	physicalPath := filepath.Join(slug, contentType, fmt.Sprintf("[Cubify] %s", fileName))
	m.fm.Delete(physicalPath)

	return m.Put(inst)
}

// MergeContainers merges extra containers into release containers for Run.
func MergeContainers(release, extra []Container) []Container {
	merged := make([]Container, len(release))
	copy(merged, release)

	for _, ec := range extra {
		found := false
		for i, mc := range merged {
			if mc.ContentType == ec.ContentType {
				merged[i].Content = append(merged[i].Content, ec.Content...)
				found = true
				break
			}
		}
		if !found {
			merged = append(merged, ec)
		}
	}

	return merged
}