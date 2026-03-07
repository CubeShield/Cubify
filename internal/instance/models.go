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
	Changelog *Changelog `json:"changelog,omitempty"`
}

type Instance struct {
	Repo string `json:"repo"`
	Slug string `json:"slug"`
	Releases []Release `json:"releases"`
}

type LocalInstance struct {
	Instance
	Release *Release `json:"release,omitempty"`
	DevMeta *Meta `json:"dev_meta,omitempty"`
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

// Changelog models

type ChangelogContentRef struct {
	Name     string `json:"name"`
	ImageURL string `json:"image_url"`
}

type MetaChange struct {
	Field    string `json:"field"`
	Label    string `json:"label"`
	OldValue string `json:"old_value"`
	NewValue string `json:"new_value"`
}

type ContainerChanges struct {
	ContentType string               `json:"content_type"`
	Added       []ChangelogContentRef `json:"added"`
	Removed     []ChangelogContentRef `json:"removed"`
	Updated     []ChangelogContentRef `json:"updated"`
}

type Changelog struct {
	Message     string             `json:"message,omitempty"`
	MetaChanges []MetaChange       `json:"meta_changes,omitempty"`
	Containers  []ContainerChanges `json:"containers,omitempty"`
}


