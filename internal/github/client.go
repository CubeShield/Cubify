package github

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Client struct {
	baseUrl string
	httpClient *http.Client
	UserAgent  string
}

func New(baseUrl string) *Client {
	return &Client{
		baseUrl: baseUrl,
		UserAgent: "Cubify-Launcher",
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *Client) sendRequest(url string, target interface{}) error {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}

	req.Header.Set("User-Agent", c.UserAgent)
	req.Header.Set("Accept", "application/json")



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

func (c *Client) GetInstance(repo string) (*Instance, error) {
	path := fmt.Sprintf("%s/repos/%s/releases", c.baseUrl, repo)
	
	var releases []Release
	if err := c.sendRequest(path, &releases); err != nil {
		return nil, err
	}
	return &Instance{
		Releases: releases,
	}, nil
}

//func (c *Client) GetLatestRelease(repo string) (*Release, error) {
//	path := fmt.Sprintf("%s/repos/%s/releases/latest", c.baseUrl, repo)
//	
//	var release Release
//	err := c.sendRequest(path, &release)
//	return &release, err
//}

func (c *Client) GetIndex(indexUrl string) (*Index, error) {
	var index Index
	err := c.sendRequest(indexUrl, &index)
	return &index, err
}