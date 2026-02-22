package editor

type ProjectConfig struct {
	RepoOwner string `json:"repo_owner"`
	RepoName  string `json:"repo_name"`
	LocalPath string `json:"local_path"`
}
