package mc

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

type Mc struct {
	bin string
	instancesDir string
}

func New(bin, instancesDir string) *Mc {
	if err := os.MkdirAll(instancesDir, 0755); err != nil {
		fmt.Printf("Error creating dir: %v\n", err)
	}
	return &Mc{
		bin: bin,
		instancesDir: instancesDir,
	}
}

func getInstanceDirectory(instanceName string) string {
	return strings.ReplaceAll(strings.ReplaceAll(instanceName, ":", ""), " ", "-")
}

func (m *Mc) Prepare(instanceName, loader, loaderVersion, minecraftVersion string) error {
	path := fmt.Sprintf("%s/%s", m.instancesDir, getInstanceDirectory(instanceName))
	version := fmt.Sprintf("%s:%s", loader, minecraftVersion)
	cmd := exec.Command(m.bin,
		"--main-dir", path,
		"start",
		"--dry", version)
	cmd.Stdout = os.Stdout
	if err := cmd.Run(); err != nil {
		return err
	}
	return nil
}


func (m *Mc) Run(instanceName, loader, loaderVersion, minecraftVersion string) error {
	path := fmt.Sprintf("%s/%s", m.instancesDir, getInstanceDirectory(instanceName))
	version := fmt.Sprintf("%s:%s", loader, minecraftVersion)
	cmd := exec.Command(m.bin,
		"--main-dir", path,
		"start",
		"--username", "Lyroq1s",
		version)
	cmd.Stdout = os.Stdout
	if err := cmd.Run(); err != nil {
		return err
	}
	return nil
}