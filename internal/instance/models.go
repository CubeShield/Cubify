package instance

import (
	"time"
)

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
	Meta Meta
}

type Instance struct {
	Releases []Release `json:"releases"`
}


type Meta struct {
	Name string `json:"name"`
	Description string `json:"description"`
	Loader string `json:"loader"`
	LoaderVersion string `json:"loader_version"`
	MinecraftVersion string `json:"minecraft_version"`
	ImageURL string `json:"image_url"`
	Containers []Container `json:"containers"`
}

type Container struct {
	ContentType string `json:"content_type"`
	Content []Content `json:"content"`
}

type Type string

const (
	TypeServer Type = "server"
	TypeClient Type = "client"
	TypeBoth Type = "both"
)

type Source string

const (
	SourceCurseForge Source = "curseforge"
	SourceModrinth Source = "modrinth"
	SourceURL Source = "url"
)

type From string

const (
	FromMain From = "main"
	FromAdditional From = "additional"
)

type Content struct {
	Name string `json:"name"`
	ImageURL string `json:"image_url"`
	Type Type `json:"type"`
	ModID string `json:"mod_id"`
	FileID string `json:"file_id"`
	Source Source `json:"source"`
	From From `json:"from"`
	File string `json:"file"`
	Url string `json:"url"`
}
