package editor

import (
	"Cubify/internal/file"
	"Cubify/internal/instance"
	"Cubify/internal/utils"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const ReleaseWorkflow = `name: Release Modpack

on:
  push:
    tags:
      - "v*"

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Create Release & Upload Assets
        uses: softprops/action-gh-release@v2
        with:
          files: |
            instance.json
          generate_release_notes: true
          draft: false
          prerelease: false
`



type Commit struct {
	Hash    string `json:"hash"`
	Message string `json:"message"`
	Date    string `json:"date"`
}

type GitHistory struct {
	Commits []Commit `json:"commits"`
	Tags    []string `json:"tags"`
}

type Manager struct {
	fm file.Manager
}

func New(fm file.Manager) *Manager {
	return &Manager{
		fm: fm,
	}
}

func (m *Manager) CreateProject(name, desc, mcVer, loader, loaderVer, repoLink, logoPath string) (string, error) {
	parts := strings.Split(repoLink, "/")
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid repo format, use 'owner/repo'")
	}
	owner, repo := parts[0], parts[1]

	projectPath := filepath.Join(utils.InstanceSlug(name), "editor") 

	//destLogo := filepath.Join(slug, "logo.png")
	//if err := copyFile(logoPath, destLogo); err != nil {
	//	return "", fmt.Errorf("failed to copy logo: %w", err)
	//}

	rawImgUrl := fmt.Sprintf("https://raw.instanceusercontent.com/%s/%s/main/logo.png", owner, repo)

	meta := instance.Meta{
		Name:             name,
		Description:      desc,
		MinecraftVersion: mcVer,
		Loader:           loader,
		LoaderVersion:    loaderVer,
		ImageURL:         rawImgUrl,
		Containers:       []instance.Container{},
	}
	if err := m.fm.SaveJson(filepath.Join(projectPath, "instance.json"), meta); err != nil {
		return "", err
	}

	if err := m.fm.Save(filepath.Join(projectPath, ".github", "workflows", "release.yml"), strings.NewReader(ReleaseWorkflow)); err != nil {
		return "", err
	}
	
	
	remoteURL := fmt.Sprintf("git@github.com:%s/%s.git", owner, repo)
	if err := runGit(projectPath, "init"); err != nil { return "", err }
	

	_ = runGit(projectPath, "branch", "-M", "main") 
	if err := runGit(projectPath, "remote", "add", "origin", remoteURL); err != nil {
		return "", err 
	}
	

	if err := runGit(projectPath, "add", "."); err != nil {
		return "", err
	}
	if err := runGit(projectPath, "commit", "-m", "Initial commit by Cubify"); err != nil {
		return "", err
	}

	if err := runGit(projectPath, "push", "-u", "origin", "main"); err != nil {
		return "", err
	}
	
	return projectPath, nil
}

func (m *Manager) SaveInstance(slug string, meta instance.Meta) error {
	return m.fm.SaveJson(filepath.Join(slug, "editor", "instance.json"), meta)
}

func (m *Manager) GitPush(projectPath, message string) error {
	if err := runGit(projectPath, "add", "."); err != nil { return err }
	if err := runGit(projectPath, "commit", "-m", message); err != nil { return err }
	return runGit(projectPath, "push", "-u", "origin", "main")
}

func (m *Manager) GitRelease(projectPath, tagName string) error {
	if err := runGit(projectPath, "tag", tagName); err != nil { return err }
	return runGit(projectPath, "push", "origin", tagName)
}


func runGit(dir string, args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("git %s failed: %s, output: %s", args[0], err, string(output))
	}
	return nil
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil { return err }
	defer in.Close()
	out, err := os.Create(dst)
	if err != nil { return err }
	defer out.Close()
	_, err = io.Copy(out, in)
	return err
}

func (m *Manager) LoadProject(path string) (*instance.Meta, error) {
	bytes, err := os.ReadFile(filepath.Join(path, "instance.json"))
	if err != nil {
		return nil, err
	}
	var meta instance.Meta
	if err := json.Unmarshal(bytes, &meta); err != nil {
		return nil, err
	}
	return &meta, nil
}

func (m *Manager) GetGitStatus(projectPath string) (bool, error) {
	cmd := exec.Command("git", "status", "--porcelain")
	cmd.Dir = projectPath
	output, err := cmd.Output()
	if err != nil {
		return false, err
	}
	return len(strings.TrimSpace(string(output))) > 0, nil
}

func (m *Manager) GetGitHistory(projectPath string) (*GitHistory, error) {
	commits := []Commit{}
	tags := []string{}

	cmdLog := exec.Command("git", "log", "-n", "10", "--pretty=format:%h|||%s|||%cr")
	cmdLog.Dir = projectPath
	
	outLog, err := cmdLog.Output()
	if err == nil {
		lines := strings.Split(strings.TrimSpace(string(outLog)), "\n")
		for _, line := range lines {
			if line == "" { continue }
			
			parts := strings.Split(line, "|||")
			if len(parts) == 3 {
				commits = append(commits, Commit{
					Hash:    parts[0],
					Message: parts[1],
					Date:    parts[2],
				})
			}
		}
	} else {
		fmt.Printf("Git log warning in %s: %v\n", projectPath, err)
	}

	cmdTags := exec.Command("git", "tag", "--sort=-creatordate") 
	cmdTags.Dir = projectPath
	outTags, err := cmdTags.Output()
	
	if err == nil {
		tagLines := strings.Split(strings.TrimSpace(string(outTags)), "\n")
		for _, t := range tagLines {
			t = strings.TrimSpace(t)
			if t != "" {
				tags = append(tags, t)
			}
		}
	}

	return &GitHistory{
        Commits: commits,
        Tags:    tags,
    }, nil
}