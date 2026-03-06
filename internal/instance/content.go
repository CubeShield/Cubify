package instance

import (
	"Cubify/internal/file"
	logger "Cubify/internal/logging"
	"path/filepath"
)


type Manager struct {
	l *logger.Logger
	fm file.Manager
	instancesDirectory string
}

func NewManager(l *logger.Logger, fm file.Manager, instancesDirectory string) *Manager {
	return &Manager{
		l: l,
		fm: fm,
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