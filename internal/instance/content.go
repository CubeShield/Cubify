package instance

import (
	"Cubify/internal/file"
	"fmt"
)


type Manager struct {
	fm file.Manager
	instancesDirectory string
}

func NewManager(fm file.Manager, instancesDirectory string) *Manager {
	return &Manager{
		fm: fm,
		instancesDirectory: instancesDirectory,
	}
}

func (m *Manager) ListInstances() ([]Instance, error) {
	installedInstances, err := m.fm.List(m.instancesDirectory)
	if err != nil {
		return nil, err
	}

	fmt.Println(installedInstances)

	return []Instance{}, nil
}