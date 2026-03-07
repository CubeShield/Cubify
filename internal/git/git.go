package git

import (
	"fmt"
	"os/exec"
	"strings"
)

type Manager struct {}

func New() *Manager {
	return &Manager{}
}


func Run(dir string, args ...string) error {
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("git %s failed: %s, output: %s", args[0], err, string(output))
	}
	return nil
}

func (m *Manager) GitPush(projectPath, message string) error {
	if err := Run(projectPath, "add", "."); err != nil { return err }
	if err := Run(projectPath, "commit", "-m", message); err != nil { return err }
	return Run(projectPath, "push", "-u", "origin", "main")
}

func (m *Manager) GitRelease(projectPath, tagName string) error {
	if err := Run(projectPath, "tag", tagName); err != nil { return err }
	return Run(projectPath, "push", "origin", tagName)
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
