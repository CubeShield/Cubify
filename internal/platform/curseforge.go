package platform

import (
	"Cubify/internal/instance"
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

func (s *CurseForgeService) GetMod(ctx context.Context, modID, fileID string) (instance.Content, error) {
	intModID, err := strconv.ParseInt(modID, 10, 32)
	if err != nil {
		return instance.Content{}, err
	}
	intFileID, err := strconv.ParseInt(fileID, 10, 32)
	if err != nil {
		return instance.Content{}, err
	}
	mod, err := s.client.Mod(schema.ModID(intModID))
	if err != nil {
		return  instance.Content{}, err
	}

	modFile, err := s.client.ModFile(schema.ModID(intModID), schema.FileID(intFileID))
	if err != nil {
		fmt.Println("bbb")
		return instance.Content{}, err
	}

	return instance.Content{
		Name: mod.Data.Name,
		ImageURL: mod.Data.Logo.ThumbnailUrl,
		Type: instance.TypeBoth,
		ModID: modID,
		FileID: fileID,
		Source: instance.SourceCurseForge,
		File: modFile.Data.FileName,
		Url: modFile.Data.DownloadURL,
	}, nil
}

// GetContentSiteURL возвращает URL страницы мода на CurseForge
func (s *CurseForgeService) GetContentSiteURL(modID string) string {
	// Получаем данные мода чтобы узнать slug
	intModID, err := strconv.ParseInt(modID, 10, 32)
	if err != nil {
		return ""
	}
	mod, err := s.client.Mod(schema.ModID(intModID))
	if err != nil {
		return ""
	}
	return fmt.Sprintf("https://www.curseforge.com/minecraft/mc-mods/%s", mod.Data.Slug)
}

// GetContentVersionURL возвращает URL конкретной версии мода на CurseForge
func (s *CurseForgeService) GetContentVersionURL(modID, fileID string) string {
	// Получаем данные мода чтобы узнать slug
	intModID, err := strconv.ParseInt(modID, 10, 32)
	if err != nil {
		return ""
	}
	mod, err := s.client.Mod(schema.ModID(intModID))
	if err != nil {
		return ""
	}
	return fmt.Sprintf("https://www.curseforge.com/minecraft/mc-mods/%s/files/%s", mod.Data.Slug, fileID)
}

// GetContentVersionsURL возвращает URL страницы со всеми версиями мода на CurseForge
func (s *CurseForgeService) GetContentVersionsURL(modID string) string {
	// Получаем данные мода чтобы узнать slug
	intModID, err := strconv.ParseInt(modID, 10, 32)
	if err != nil {
		return ""
	}
	mod, err := s.client.Mod(schema.ModID(intModID))
	if err != nil {
		return ""
	}
	return fmt.Sprintf("https://www.curseforge.com/minecraft/mc-mods/%s/files/all", mod.Data.Slug)
}