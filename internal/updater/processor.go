package updater

import (
	"Cubify/internal/file"
	"Cubify/internal/github"
	logger "Cubify/internal/logging"
	"fmt"
	"net/http"
	"path/filepath"
	"time"
)


type ContentProcessor struct {
	l *logger.Logger
	contentType      string
	apiContent       []github.Content
	installedContent []github.Content
	
	httpClient *http.Client
	fm        file.Manager
}

func NewContentProcessor(
	container github.Container,
	installedContainer github.Container,
	fm file.Manager,
	l *logger.Logger,
) *ContentProcessor {
	return &ContentProcessor{
		l: l,
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
	p.l.Info("Handling container %s", p.contentType)

	apiSet := p.toSet(p.apiContent)
	installedSet := p.toSet(p.installedContent)

	for fileName := range installedSet {
		if _, exists := apiSet[fileName]; !exists {
			if err := p.delete(installedSet[fileName]); err != nil {
				p.l.Error("Failed while deleting %s: %v", fileName, err)
			}
		}
	}


	for fileName := range apiSet {
		if _, exists := installedSet[fileName]; !exists {
			if err := p.install(apiSet[fileName]); err != nil {
				p.l.Error("Failed while downloading %s: %v", fileName, err)
			}
		}
	}
	p.l.Info("💅 Dоne")
	return nil
}

func (p *ContentProcessor) delete(content github.Content) error {
	p.l.Info("Deleting %s", content.File)
	fileNameWithPrefix := fmt.Sprintf("[Cubify] %s", content.File)
	relativePath := filepath.Join(p.contentType, fileNameWithPrefix)
	return p.fm.Delete(relativePath)
}

func (p *ContentProcessor) install(content github.Content) error {
	p.l.Info("Downloading %s", content.File)

	resp, err := p.httpClient.Get(content.Url)
	if err != nil {
		return fmt.Errorf("failed while downloading file %s: %w", content.Url, err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server responded with incorrect status for file %s: %s", content.Url, resp.Status)
	}

	defer resp.Body.Close()

	fileNameWithPrefix := fmt.Sprintf("[Cubify] %s", content.File)
	relativePath := filepath.Join(p.contentType, fileNameWithPrefix)

	return p.fm.Save(relativePath, resp.Body)
}