package platform

import (
	"Cubify/internal/instance"
	"context"
	"fmt"
	"strings"

	"github.com/sjet47/go-curseforge"
)


type URLService struct {
	client *curseforge.Client
}

func NewURLService() Service {
	return &URLService{}
}

func (s *URLService) ParseURL(ctx context.Context, url string) (filename, backUrl string, err error) {
	// Парсим такое: https://choto.ru/afasdasd/asdasdasd/das/hdffsdd.jar
	parts := strings.Split(url, "/")
	if len(parts) < 1 {
		return "", "", fmt.Errorf("not enough mod amount")
	}
	
	filename = parts[len(parts)-1]
	return filename, url, nil
}

func (s *URLService) GetMod(ctx context.Context, filename, url string) (instance.Content, error) {
	return instance.Content{
		Name: strings.Split(filename, ".")[0],
		ImageURL: "",
		Type: instance.TypeBoth,
		ModID: "",
		FileID: "",
		Source: instance.SourceURL,
		File: filename,
		Url: url,
	}, nil
}

// GetContentSiteURL для RAW URL не имеет смысла
func (s *URLService) GetContentSiteURL(modID string) string {
	return ""
}

// GetContentVersionURL для RAW URL не имеет смысла
func (s *URLService) GetContentVersionURL(modID, fileID string) string {
	return ""
}

// GetContentVersionsURL для RAW URL не имеет смысла
func (s *URLService) GetContentVersionsURL(modID string) string {
	return ""
}