package updater

import (
	"Cubify/internal/file"
	"Cubify/internal/instance"
	logger "Cubify/internal/logging"
	"context"
	"fmt"
	"net/http"
	"path/filepath"
	"time"
)


type ContentProcessor struct {
	l *logger.Logger
	contentType      string
	apiContent       []instance.Content
	installedContent []instance.Content
	
	httpClient *http.Client
	fm        file.Manager
}

func NewContentProcessor(
	container instance.Container,
	installedContainer instance.Container,
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

func (p *ContentProcessor) toSet(contentList []instance.Content) map[string]instance.Content {
	set := make(map[string]instance.Content, len(contentList))
	for _, item := range contentList {
		set[item.File] = item
	}
	return set
}

func (p *ContentProcessor) Process(ctx context.Context) error {
	p.l.Info("Handling container %s", p.contentType)

	apiSet := p.toSet(p.apiContent)
	installedSet := p.toSet(p.installedContent)

	for fileName := range installedSet {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if _, exists := apiSet[fileName]; !exists {
			if err := p.delete(installedSet[fileName]); err != nil {
				p.l.Error("Failed while deleting %s: %v", fileName, err)
			}
		}
	}


	for fileName := range apiSet {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if _, exists := installedSet[fileName]; !exists {
			if err := p.install(ctx, apiSet[fileName]); err != nil {
				p.l.Error("Failed while downloading %s: %v", fileName, err)
			}
		}
	}
	p.l.Info("💅 Dоne")
	return nil
}

func (p *ContentProcessor) delete(content instance.Content) error {
	p.l.Info("Deleting %s", content.File)
	fileNameWithPrefix := fmt.Sprintf("[Cubify] %s", content.File)
	relativePath := filepath.Join(p.contentType, fileNameWithPrefix)
	return p.fm.Delete(relativePath)
}

func (p *ContentProcessor) install(ctx context.Context, content instance.Content) error {
	p.l.Info("Downloading %s", content.File)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, content.Url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request for %s: %w", content.Url, err)
	}

	resp, err := p.httpClient.Do(req)
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