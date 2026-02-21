package updater

import (
	"Cubify/filesystem"
	"Cubify/internal/github"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"time"
)


type ContentProcessor struct {
	contentType      string
	apiContent       []github.Content
	installedContent []github.Content
	httpClient *http.Client
	fm        *filesystem.FileManager
}

func NewContentProcessor(
	container github.Container,
	installedContainer github.Container,
	fm *filesystem.FileManager,
) *ContentProcessor {
	return &ContentProcessor{
		contentType:      container.ContentType,
		apiContent:       container.Content,
		installedContent: installedContainer.Content,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		fm:               fm,
	}
}

func (p *ContentProcessor) toSet(contentList []github.Content) map[string]github.Content {
	set := make(map[string]github.Content, len(contentList))
	for _, item := range contentList {
		set[item.File] = item
	}
	return set
}

func (p *ContentProcessor) Process() error {
	fmt.Printf("● Обработка %s\n", p.contentType)

	apiSet := p.toSet(p.apiContent)
	installedSet := p.toSet(p.installedContent)

	for fileName := range installedSet {
		if _, exists := apiSet[fileName]; !exists {
			if err := p.delete(installedSet[fileName]); err != nil {
				fmt.Printf("Ошибка удаления %s: %v\n", fileName, err)
			}
		}
	}


	for fileName := range apiSet {
		if _, exists := installedSet[fileName]; !exists {
			if err := p.install(apiSet[fileName]); err != nil {
				fmt.Printf("Ошибка установки %s: %v\n", fileName, err)
			}
		}
	}
	fmt.Printf("✔ Завершнено\n\n")
	return nil
}

func (p *ContentProcessor) delete(content github.Content) error {
	log.Printf("· Удаление %s\n", content.File)
	fileNameWithPrefix := fmt.Sprintf("[CubeHopper] %s", content.File)
	relativePath := filepath.Join(p.contentType, fileNameWithPrefix)
	return p.fm.Delete(relativePath)
}

func (p *ContentProcessor) install(content github.Content) error {
	log.Printf("· Скачивание %s\n", content.File)

	resp, err := p.httpClient.Get(content.Url)
	if err != nil {
		return fmt.Errorf("ошибка при скачивании файла с %s: %w", content.Url, err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("сервер вернул неверный статус для файла %s: %s", content.Url, resp.Status)
	}

	defer resp.Body.Close()

	fileNameWithPrefix := fmt.Sprintf("[CubeHopper] %s", content.File)
	relativePath := filepath.Join(p.contentType, fileNameWithPrefix)

	return p.fm.Save(relativePath, resp.Body)
}