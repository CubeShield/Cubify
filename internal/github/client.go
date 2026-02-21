package github

import (
	"Cubify/internal/cache"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseUrl string
	authorizationToken string
	httpClient *http.Client
	UserAgent  string
	cm *cache.CacheManager
}

func New(baseUrl, authorizationToken string) *Client {
	return &Client{
		baseUrl: baseUrl,
		authorizationToken: authorizationToken,
		UserAgent: "Cubify-Launcher",
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		cm: cache.New(),
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

func (c *Client) GetMeta(url string) (Meta, error) {
	var meta Meta
	if err := c.sendRequest(url, &meta); err != nil {
		return Meta{}, err
	}

	return meta, nil
}

func (c *Client) GetInstance(repo string) (*Instance, error) {
	path := fmt.Sprintf("%s/repos/%s/releases", c.baseUrl, repo)
	
	var releases []Release
	instanceCacheKey := getInstanceCacheKey(repo)
	if err := c.sendRequest(path, &releases); err != nil {
		var instance Instance
		if err := c.cm.Get(instanceCacheKey, &instance); err != nil {
			return nil, fmt.Errorf("cannot get instance from github and cache: %v", err)
		}
		log.Println("cannot get instance from github, used cached")
		return &instance, nil
	}

	var updatedReleases []Release
	for _, release := range releases {
		metaURL := ""
		for _, asset := range release.Assets {
			if asset.Name == "instance.json" {
				metaURL = asset.BrowserDownloadURL
			}
		}
		if metaURL == "" {
			log.Printf("Error while getting meta url for %s", release.URL)
			continue
		}
		var meta Meta
		metaCacheKey := getMetaCacheKey(repo, release.Name)
		if err := c.cm.Get(metaCacheKey, &meta); err != nil {
			meta, err = c.GetMeta(metaURL)
			if err != nil {
				log.Printf("Error while getting meta: %v", err)
				continue
			}
			if err := c.cm.Put(metaCacheKey, meta); err != nil {
				log.Printf("failed to cache: %v", err)
			}
		}

		release.Meta = meta
		updatedReleases = append(updatedReleases, release)
	}

	instance := &Instance{
		Releases: updatedReleases,
	}

	c.cm.Put(instanceCacheKey, instance)
	return instance, nil
}

func (c *Client) GetIndex(indexUrl string) (*Index, error) {
	var index Index
	indexCacheKey := getIndexCacheKey(indexUrl)
	if err := c.sendRequest(indexUrl, &index); err != nil {
		if err := c.cm.Get(indexCacheKey, &index); err != nil {
			return nil, fmt.Errorf("cannot get index from github and cache: %v", err)
		}
		log.Println("cannot get index from github, used cached")
		return &index, nil
	}
	c.cm.Put(indexCacheKey, &index)
	return &index, nil
}