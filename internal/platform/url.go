package platform

import (
	"Cubify/internal/github"
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

func (s *URLService) GetMod(ctx context.Context, filename, url string) (github.Content, error) {
	return github.Content{
		Name: strings.Split(filename, ".")[0],
		ImageURL: "",
		Type: github.TypeBoth,
		ModID: "",
		FileID: "",
		Source: github.SourceURL,
		File: filename,
		Url: url,
	}, nil
}