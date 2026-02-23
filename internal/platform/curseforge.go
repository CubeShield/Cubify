package platform

import (
	"Cubify/internal/github"
	"context"
	"strconv"

	"github.com/sjet47/go-curseforge"
	"github.com/sjet47/go-curseforge/schema"
)


type CurseForgeService struct {
	client *curseforge.Client
}

func NewCurseForgeService(apiKey string) Service {
	return &CurseForgeService{
		client: curseforge.NewClient(apiKey),
	}
}

func (s *CurseForgeService) GetMod(ctx context.Context, modID, fileID string) (github.Content, error) {
	intModID, err := strconv.ParseInt(modID, 10, 32)
	if err != nil {
		return github.Content{}, err
	}
	intFileID, err := strconv.ParseInt(modID, 10, 32)
	if err != nil {
		return github.Content{}, err
	}
	resp, err := s.client.ModFile(schema.ModID(intModID), schema.FileID(intFileID))
	if err != nil {
		return github.Content{}, err
	}

	return github.Content{
		Name: resp.Data.DisplayName,
		ImageURL: "",
		Type: github.TypeBoth,
		ModID: modID,
		FileID: fileID,
		Source: github.SourceCurseForge,
		File: resp.Data.FileName,
		Url: resp.Data.DownloadURL,
	}, nil
}