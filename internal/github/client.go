package github

import (
	"Cubify/internal/cache"
	"Cubify/internal/instance"
	logger "Cubify/internal/logging"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	l *logger.Logger
	baseUrl string
	authorizationToken string
	httpClient *http.Client
	UserAgent  string
	cm *cache.CacheManager
}

func New(baseUrl, authorizationToken, cacheDir string, l *logger.Logger) *Client {
	return &Client{
		l: l,
		baseUrl: baseUrl,
		authorizationToken: authorizationToken,
		UserAgent: "Cubify-Launcher",
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		cm: cache.New(cacheDir),
	}
}

func getInstanceCacheKey(instanceRepo string) string {
	return strings.ReplaceAll(instanceRepo, "/", ".")
}

func getMetaCacheKey(instanceRepo, version string) string {
	return fmt.Sprintf("%s.%s", getInstanceCacheKey(instanceRepo), version)
}

func getIndexCacheKey(indexURL string) string {
	return strings.ReplaceAll(strings.ReplaceAll(indexURL, "https://", ""), "/", ".")
}

func (c *Client) sendRequest(url string, target interface{}) error {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}

	req.Header.Set("User-Agent", c.UserAgent)
	req.Header.Set("Accept", "application/json")
	if c.authorizationToken != "" {
		req.Header.Set("Authorization", c.authorizationToken)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("github api error: status %d for %s", resp.StatusCode, url)
	}

	if err := json.NewDecoder(resp.Body).Decode(target); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	return nil
}

func (c *Client) GetMeta(url string) (instance.Meta, error) {
	var meta instance.Meta
	if err := c.sendRequest(url, &meta); err != nil {
		return instance.Meta{}, err
	}

	return meta, nil
}

func (c *Client) GetInstance(repo string) (*instance.Instance, error) {
	path := fmt.Sprintf("%s/repos/%s/releases", c.baseUrl, repo)
	
	var releases []instance.Release
	instanceCacheKey := getInstanceCacheKey(repo)
	if err := c.sendRequest(path, &releases); err != nil {
		var instance instance.Instance
		if err := c.cm.Get(instanceCacheKey, &instance); err != nil {
			return nil, fmt.Errorf("cannot get instance from github and cache: %v", err)
		}
		c.l.Info("cannot get instance from github, used cached for %s", repo)
		return &instance, nil
	}

	var updatedReleases []instance.Release
	for _, release := range releases {
		metaURL := ""
		for _, asset := range release.Assets {
			if asset.Name == "instance.json" {
				metaURL = asset.BrowserDownloadURL
			}
		}
		if metaURL == "" {
			c.l.Error("failed to get meta url for %s", release.URL)
			continue
		}
		var meta instance.Meta
		metaCacheKey := getMetaCacheKey(repo, release.Name)
		if err := c.cm.Get(metaCacheKey, &meta); err != nil {
			meta, err = c.GetMeta(metaURL)
			if err != nil {
				c.l.Error("failed to get meta: %v", err)
				continue
			}
			if err := c.cm.Put(metaCacheKey, meta); err != nil {
				c.l.Error("failed to cache: %v", err)
			}
		}

		release.Meta = meta
		updatedReleases = append(updatedReleases, release)
	}

	instance := &instance.Instance{
		Releases: updatedReleases,
	}

	c.cm.Put(instanceCacheKey, instance)
	return instance, nil
}

func (c *Client) GetIndex(indexUrl string) (*instance.Index, error) {
	var index instance.Index
	indexCacheKey := getIndexCacheKey(indexUrl)
	if err := c.sendRequest(indexUrl, &index); err != nil {
		if err := c.cm.Get(indexCacheKey, &index); err != nil {
			return nil, fmt.Errorf("cannot get index from github and cache: %v", err)
		}
		c.l.Info("cannot get index from github, used cached")
		return &index, nil
	}
	c.cm.Put(indexCacheKey, &index)
	return &index, nil
}