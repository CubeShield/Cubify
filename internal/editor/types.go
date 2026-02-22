package editor

type ProjectConfig struct {
	RepoOwner string `json:"repo_owner"`
	RepoName  string `json:"repo_name"`
	LocalPath string `json:"local_path"`
}

type GitHistory struct {
	Commits []Commit `json:"commits"`
	Tags    []string `json:"tags"`
}