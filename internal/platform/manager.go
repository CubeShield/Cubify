package platform

import (
	"Cubify/internal/github"
	"context"
	"fmt"
	"strings"
)


type Manager struct {
	services map[github.Source]Service
}

func NewManager(curseForgeAPIKey string) *Manager {
	return &Manager{
		services: map[github.Source]Service{
			github.SourceCurseForge: NewCurseForgeService(curseForgeAPIKey),
			github.SourceURL: NewURLService(),
		},
	}
}

func classify(url string) github.Source {
	contains := func(args ...string) bool {
		res := false
		for _, arg := range args {
			res = res || strings.Contains(url, arg)
		}
		return res
	}

	switch {
	case contains("modrinth"):
		return github.SourceModrinth
	case contains("curseforge"):
		return github.SourceCurseForge
	default:
		return github.SourceURL
	}
}

func (m *Manager) GetModFromURL(ctx context.Context, url string) (github.Content, error) {
	source := classify(url)
	service, ok := m.services[source]
	if !ok {
		return github.Content{}, fmt.Errorf("not found service for this source")
	}
	modID, fileID, err := service.ParseURL(ctx, url)
	if err != nil {
		return github.Content{}, err
	}

	content, err := service.GetMod(ctx, modID, fileID)
	if err != nil {
		return github.Content{}, err
	}

	return content, nil
}

type Service interface {
	ParseURL(ctx context.Context, url string) (string, string, error)
	GetMod(ctx context.Context, modID, fileID string) (github.Content, error)
}