package updater

import (
	"Cubify/internal/file"
	"Cubify/internal/instance"
	logger "Cubify/internal/logging"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"
	"time"
)

// ConfigFileRecord tracks whether a config file was written by Cubify and its last known content hash.
type ConfigFileRecord struct {
	Hash    string `json:"hash"`
	Written bool   `json:"written"`
}

// ConfigState is persisted as cubify_config_state.json in the instance directory.
type ConfigState struct {
	Files map[string]*ConfigFileRecord `json:"files"`
}

type ContentProcessor struct {
	l           *logger.Logger
	contentType string
	pathPrefix  string // full relative path prefix, e.g. "config/somemod"
	apiContent  []instance.Content
	installedContent []instance.Content
	buildType   string

	httpClient *http.Client
	fm         file.Manager
}

func NewContentProcessor(
	container instance.Container,
	installedContainer instance.Container,
	fm file.Manager,
	buildType string,
	l *logger.Logger,
) *ContentProcessor {
	return &ContentProcessor{
		l:                l,
		contentType:      container.ContentType,
		pathPrefix:       container.ContentType,
		apiContent:       container.Content,
		installedContent: installedContainer.Content,
		buildType:        buildType,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		fm: fm,
	}
}

func NewContentProcessorWithPrefix(
	container instance.Container,
	installedContainer instance.Container,
	fm file.Manager,
	buildType string,
	pathPrefix string,
	l *logger.Logger,
) *ContentProcessor {
	return &ContentProcessor{
		l:                l,
		contentType:      container.ContentType,
		pathPrefix:       pathPrefix,
		apiContent:       container.Content,
		installedContent: installedContainer.Content,
		buildType:        buildType,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		fm: fm,
	}
}

func (p *ContentProcessor) toSet(contentList []instance.Content) map[string]instance.Content {
	set := make(map[string]instance.Content, len(contentList))
	for _, item := range contentList {
		set[item.File] = item
	}
	return set
}

func (p *ContentProcessor) matchesBuildType(content instance.Content) bool {
	ct := string(content.Type)
	if ct == "" || ct == string(instance.TypeBoth) {
		return true
	}
	switch p.buildType {
	case "client":
		return ct == string(instance.TypeClient) || ct == string(instance.TypeBoth)
	case "server":
		return ct == string(instance.TypeServer) || ct == string(instance.TypeBoth)
	default:
		return true
	}
}

func (p *ContentProcessor) filterByBuildType(contentList []instance.Content) []instance.Content {
	var result []instance.Content
	for _, c := range contentList {
		if p.matchesBuildType(c) {
			result = append(result, c)
		}
	}
	return result
}

func (p *ContentProcessor) isConfigKind(c instance.Content) bool {
	return c.Kind == instance.ContentKindContent
}

func contentHash(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func (p *ContentProcessor) loadConfigState() ConfigState {
	var state ConfigState
	_ = p.fm.ReadJson("cubify_config_state.json", &state)
	if state.Files == nil {
		state.Files = make(map[string]*ConfigFileRecord)
	}
	return state
}

func (p *ContentProcessor) saveConfigState(state ConfigState) {
	_ = p.fm.SaveJson("cubify_config_state.json", state)
}

func (p *ContentProcessor) Process(ctx context.Context) error {
	p.l.Info("Handling container %s (build_type=%s)", p.pathPrefix, p.buildType)

	filtered := p.filterByBuildType(p.apiContent)

	// Separate external and config items
	var externalItems, configItems []instance.Content
	for _, item := range filtered {
		if p.isConfigKind(item) {
			configItems = append(configItems, item)
		} else {
			externalItems = append(externalItems, item)
		}
	}

	// Process external items (existing download/delete logic)
	if err := p.processExternal(ctx, externalItems); err != nil {
		return err
	}

	// Process config items (inline file_content with policy)
	if len(configItems) > 0 {
		if err := p.processConfigItems(ctx, configItems); err != nil {
			return err
		}
	}

	p.l.Info("Done processing %s", p.pathPrefix)
	return nil
}

func (p *ContentProcessor) processExternal(ctx context.Context, apiItems []instance.Content) error {
	// Filter installed to only external kind
	var installedExternal []instance.Content
	for _, item := range p.installedContent {
		if !p.isConfigKind(item) {
			installedExternal = append(installedExternal, item)
		}
	}

	apiSet := p.toSet(apiItems)
	installedSet := p.toSet(installedExternal)

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
	return nil
}

func (p *ContentProcessor) processConfigItems(ctx context.Context, items []instance.Content) error {
	state := p.loadConfigState()
	dirty := false

	for _, item := range items {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if item.File == "" || item.FileContent == "" {
			continue
		}

		relPath := filepath.Join(p.pathPrefix, item.File)
		// Normalize to forward slashes for state key
		stateKey := strings.ReplaceAll(relPath, "\\", "/")

		hash := contentHash(item.FileContent)
		record := state.Files[stateKey]
		if record == nil {
			record = &ConfigFileRecord{}
			state.Files[stateKey] = record
		}

		policy := item.Policy
		if policy == "" {
			policy = instance.PolicySoft
		}

		shouldWrite := false
		switch policy {
		case instance.PolicySoft:
			shouldWrite = !record.Written
		case instance.PolicyOnUpdate:
			shouldWrite = record.Hash != hash
		case instance.PolicyHard:
			shouldWrite = true
		}

		if shouldWrite {
			p.l.Info("Writing config file %s (policy=%s)", relPath, policy)
			if err := p.writeContent(relPath, item.FileContent); err != nil {
				p.l.Error("Failed to write config file %s: %v", relPath, err)
				continue
			}
			record.Written = true
			record.Hash = hash
			dirty = true
		}
	}

	if dirty {
		p.saveConfigState(state)
	}
	return nil
}

func (p *ContentProcessor) writeContent(relPath, content string) error {
	return p.fm.Save(relPath, strings.NewReader(content))
}

func (p *ContentProcessor) delete(content instance.Content) error {
	p.l.Info("Deleting %s", content.File)
	fileNameWithPrefix := fmt.Sprintf("[Cubify] %s", content.File)
	relativePath := filepath.Join(p.pathPrefix, fileNameWithPrefix)
	return p.fm.Delete(relativePath)
}

func (p *ContentProcessor) install(ctx context.Context, content instance.Content) error {
	if content.Url == "" {
		p.l.Info("Skipping %s (local file, already in place)", content.File)
		return nil
	}
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
	relativePath := filepath.Join(p.pathPrefix, fileNameWithPrefix)

	return p.fm.Save(relativePath, resp.Body)
}
