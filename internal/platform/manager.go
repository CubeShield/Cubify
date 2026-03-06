package platform

import (
	"Cubify/internal/instance"
	"context"
	"fmt"
	"strings"
)


type Manager struct {
	services map[instance.Source]Service
}

func NewManager(curseForgeAPIKey string) *Manager {
	return &Manager{
		services: map[instance.Source]Service{
			instance.SourceCurseForge: NewCurseForgeService(curseForgeAPIKey),
			instance.SourceModrinth: NewModrinthService(),
			instance.SourceURL: NewURLService(),
		},
	}
}

func classify(url string) instance.Source {
	contains := func(args ...string) bool {
		res := false
		for _, arg := range args {
			res = res || strings.Contains(url, arg)
		}
		return res
	}

	switch {
	case contains("modrinth"):
		return instance.SourceModrinth
	case contains("curseforge"):
		return instance.SourceCurseForge
	default:
		return instance.SourceURL
	}
}

func (m *Manager) GetModFromURL(ctx context.Context, url string) (instance.Content, error) {
	source := classify(url)
	service, ok := m.services[source]
	if !ok {
		return instance.Content{}, fmt.Errorf("not found service for this source")
	}
	modID, fileID, err := service.ParseURL(ctx, url)
	if err != nil {
		return instance.Content{}, err
	}

	content, err := service.GetMod(ctx, modID, fileID)
	if err != nil {
		return instance.Content{}, err
	}

	return content, nil
}

// GetContentSiteURL возвращает URL страницы контента
func (m *Manager) GetContentSiteURL(source instance.Source, modID string) (string, error) {
	service, ok := m.services[source]
	if !ok {
		return "", fmt.Errorf("not found service for source: %s", source)
	}
	return service.GetContentSiteURL(modID), nil
}

// GetContentVersionURL возвращает URL конкретной версии контента
func (m *Manager) GetContentVersionURL(source instance.Source, modID, fileID string) (string, error) {
	service, ok := m.services[source]
	if !ok {
		return "", fmt.Errorf("not found service for source: %s", source)
	}
	return service.GetContentVersionURL(modID, fileID), nil
}

// GetContentVersionsURL возвращает URL страницы со всеми версиями контента
func (m *Manager) GetContentVersionsURL(source instance.Source, modID string) (string, error) {
	service, ok := m.services[source]
	if !ok {
		return "", fmt.Errorf("not found service for source: %s", source)
	}
	return service.GetContentVersionsURL(modID), nil
}

type Service interface {
	ParseURL(ctx context.Context, url string) (string, string, error)
	GetMod(ctx context.Context, modID, fileID string) (instance.Content, error)
	GetContentSiteURL(modID string) string
	GetContentVersionURL(modID, fileID string) string
	GetContentVersionsURL(modID string) string
}