package mc

import (
	"bufio"
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

func (m *Mc) AuthenticateMicrosoft(callbackCode func(string, string), callbackSuccess func(string, string)) error {
	cmd := exec.Command(m.bin, "--output", "machine", "auth", "login")
	
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.Fields(line)

		if len(parts) == 0 {
			continue
		}

		if parts[0] == "auth_device_code" && len(parts) >= 3 {
			url := parts[1]
			code := parts[2]
			callbackCode(url, code)
		}

		if parts[0] == "auth_account_authenticated" && len(parts) >= 3 {
			uuid := parts[1]
			username := parts[2]
			callbackSuccess(uuid, username)
		}
	}

	return cmd.Wait()
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