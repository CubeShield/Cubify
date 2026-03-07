package instance

import (
	"Cubify/internal/file"
	"Cubify/internal/git"
	logger "Cubify/internal/logging"
	"Cubify/internal/utils"
	"path/filepath"
)


type Manager struct {
	l *logger.Logger
	fm file.Manager
	pm *ProjectManager
	instancesDirectory string
}

func NewManager(l *logger.Logger, fm file.Manager, instancesDirectory string) *Manager {
	return &Manager{
		l: l,
		fm: fm,
		pm: NewProjectManager(fm),
		instancesDirectory: instancesDirectory,
	}
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
	return nil
}

func (m *Manager) SaveProject(slug string, meta Meta) error {
	return m.pm.Save(slug, meta)
}

func (m *Manager) LoadProject(slug string) (Meta, error) {
	return m.pm.Load(slug)
}

func (m *Manager) SyncProject(slug, message string) error {
	return m.pm.Commit(slug, message)
}

func (m *Manager) ReleaseProject(slug, tagName string) error {
	return m.pm.Release(slug, tagName)
}

func (m *Manager) CreateProject(project ProjectSettings) (LocalInstance, error) {
	if err := m.pm.Create(project); err != nil {
		return LocalInstance{}, err
	}

	meta, err := m.pm.Load(utils.InstanceSlug(project.Name))
	if err != nil {
		return LocalInstance{}, err
	}

	localInstance := LocalInstance{
		Instance: Instance{
			Repo: project.RepoLink,
			Slug: utils.InstanceSlug(project.Name),
		},
		DevMeta: &meta,
	}

	if err := m.Put(localInstance); err != nil {
		return LocalInstance{}, err
	}

	return localInstance, nil
}

func (m *Manager) GetGitHistory(slug string) (*git.GitHistory, error) {
	return m.pm.GetGitHistory(slug)
}

func(m *Manager) GetGitStatus(slug string) (bool, error) {
    return m.pm.GetGitStatus(slug)
}