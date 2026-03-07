package editor

import (
	"Cubify/internal/instance"
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
	ProjectsDir string
}

func New(projectsDir string) *Manager {
	_ = os.MkdirAll(projectsDir, 0755)
	return &Manager{ProjectsDir: projectsDir}
}

func (m *Manager) CreateProject(name, desc, mcVer, loader, loaderVer, repoLink, logoPath string) (string, error) {
	parts := strings.Split(repoLink, "/")
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid repo format, use 'owner/repo'")
	}
	owner, repo := parts[0], parts[1]

	projectPath := filepath.Join(m.ProjectsDir, name)
	if err := os.MkdirAll(projectPath, 0755); err != nil {
		return "", err
	}

	destLogo := filepath.Join(projectPath, "logo.png")
	if err := copyFile(logoPath, destLogo); err != nil {
		return "", fmt.Errorf("failed to copy logo: %w", err)
	}

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
	if err := saveJSON(filepath.Join(projectPath, "instance.json"), meta); err != nil {
		return "", err
	}

	workflowsDir := filepath.Join(projectPath, ".instance", "workflows")
	if err := os.MkdirAll(workflowsDir, 0755); err != nil {
		return "", err
	}
	if err := os.WriteFile(filepath.Join(workflowsDir, "release.yml"), []byte(ReleaseWorkflow), 0644); err != nil {
		return "", err
	}
	
	
	remoteURL := fmt.Sprintf("git@instance.com:%s/%s.git", owner, repo)
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

func (m *Manager) SaveInstance(projectPath string, meta instance.Meta) error {
	return saveJSON(filepath.Join(projectPath, "instance.json"), meta)
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

func saveJSON(path string, data interface{}) error {
	bytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil { return err }
	return os.WriteFile(path, bytes, 0644)
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

func (m *Manager) ListProjects() ([]instance.Project, error) {
	entries, err := os.ReadDir(m.ProjectsDir)
	if err != nil {
		return nil, err
	}

	var projects []instance.Project
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		fullPath := filepath.Join(m.ProjectsDir, entry.Name())
		metaPath := filepath.Join(fullPath, "instance.json")

		if _, err := os.Stat(metaPath); os.IsNotExist(err) {
			continue
		}

		meta, err := m.LoadProject(fullPath)
		if err != nil {
			continue 
		}

		projects = append(projects, instance.Project{
			Name: meta.Name,
			Path: fullPath,
			Meta: *meta,
		})
	}
	return projects, nil
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