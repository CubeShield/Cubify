package platform

import (
	"Cubify/internal/github"
	"context"
	"fmt"
	"strconv"
	"strings"

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

func (s *CurseForgeService) ParseURL(ctx context.Context, url string) (modID, fileID string, err error) {
	// Парсим такое: https://www.curseforge.com/minecraft/mc-mods/cloth-config/files/7361439
	url = strings.ReplaceAll(url, "https://www.curseforge.com/minecraft/mc-mods/", "")
	url = strings.ReplaceAll(url, "/files/", " ")
	parts := strings.Split(url, " ")
	modName, fileID := parts[0], parts[1]
	mods, err := s.client.SearchMod(432, s.client.WithSlug(modName))
	if err != nil {
		return "", "", err
	}
	if len(mods.Data) < 1 {
		return "", "", fmt.Errorf("not enough mod amount")
	}
	modID = mods.Data[0].ID.Param()
	fmt.Println(modID, fileID)
	return modID, fileID, nil
}

func (s *CurseForgeService) GetMod(ctx context.Context, modID, fileID string) (github.Content, error) {
	intModID, err := strconv.ParseInt(modID, 10, 32)
	if err != nil {
		return github.Content{}, err
	}
	intFileID, err := strconv.ParseInt(fileID, 10, 32)
	if err != nil {
		return github.Content{}, err
	}
	mod, err := s.client.Mod(schema.ModID(intModID))
	if err != nil {
		return  github.Content{}, err
	}

	modFile, err := s.client.ModFile(schema.ModID(intModID), schema.FileID(intFileID))
	if err != nil {
		fmt.Println("bbb")
		return github.Content{}, err
	}

	return github.Content{
		Name: mod.Data.Name,
		ImageURL: mod.Data.Logo.ThumbnailUrl,
		Type: github.TypeBoth,
		ModID: modID,
		FileID: fileID,
		Source: github.SourceCurseForge,
		File: modFile.Data.FileName,
		Url: modFile.Data.DownloadURL,
	}, nil
}