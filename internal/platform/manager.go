package platform

import (
	"Cubify/internal/github"
	"context"
)


type Manager struct {

}

type Service interface {
	GetMod(ctx context.Context, modID, fileID string) (github.Content, error)
}