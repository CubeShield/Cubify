package github

import "time"

type Index struct {
	ProviderName string `json:"provider_name"`
	Instances []string `json:"instances"`
}

type Asset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
	ContentType        string `json:"content_type"`
}

type Release struct {
	URL string `json:"url"`
	TagName string `json:"tag_name"`
	Name string `json:"name"`
	Body string `json:"body"`
	CreatedAt time.Time `json:"created_at"`
	Assets      []Asset   `json:"assets"`
}

type Instance struct {
	Releases []Release `json:"releases"`
}
