package git


type Commit struct {
	Hash    string `json:"hash"`
	Message string `json:"message"`
	Date    string `json:"date"`
}

type GitHistory struct {
	Commits []Commit `json:"commits"`
	Tags    []string `json:"tags"`
}