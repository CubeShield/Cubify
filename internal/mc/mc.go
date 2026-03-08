package mc

import (
	logger "Cubify/internal/logging"
	"Cubify/internal/utils"
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
)

type Mc struct {
	l *logger.Logger
	bin string
	instancesDir string
	jvmPath string
	jvmMinRAM int
	jvmMaxRAM int
}

func New(bin, instancesDir string, jvmPath string, jvmMinRAM, jvmMaxRAM int, l *logger.Logger) *Mc {
	if err := os.MkdirAll(instancesDir, 0755); err != nil {
		fmt.Printf("Error creating dir: %v\n", err)
	}
	return &Mc{
		l: l,
		bin: bin,
		instancesDir: instancesDir,
		jvmPath: jvmPath,
		jvmMinRAM: jvmMinRAM,
		jvmMaxRAM: jvmMaxRAM,
	}
}

func (m *Mc) AuthenticateMicrosoft(callbackCode func(string, string), callbackSuccess func(string, string)) error {
	cmd := exec.Command(m.bin, 
		"--msa-db-file", "./msa-db.json",
		"--output", "machine", 
		"auth", 
		"login")
	
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

func (m *Mc) Prepare(ctx context.Context, instanceName, loader, loaderVersion, minecraftVersion string) error {
	path := fmt.Sprintf("%s/%s", m.instancesDir, utils.InstanceSlug(instanceName))
	version := fmt.Sprintf("%s:%s", loader, minecraftVersion)
	cmd := exec.CommandContext(ctx, m.bin,
		"--main-dir", path,
		"start",
		"--dry", 
		"--jvm-policy", "system-then-mojang",
		version)
	
	return m.executeWithLogging(cmd)
}


func (m *Mc) Run(ctx context.Context, instanceName, loader, loaderVersion, minecraftVersion, uuid, username string) error {
	path := fmt.Sprintf("%s/%s", m.instancesDir, utils.InstanceSlug(instanceName))
	version := fmt.Sprintf("%s:%s", loader, minecraftVersion)

	args := []string{
		"--main-dir", path,
		"--msa-db-file", "./msa-db.json",
		"start",
		"--username", username,
		"--uuid", uuid,
		"--auth",
		"--jvm-policy", "system-then-mojang",
		version, 
	}

	if m.jvmPath != "" {
		args = append(args, "--jvm")
		args = append(args, m.jvmPath)
	}

	var jvmArgs []string
	if m.jvmMinRAM > 0 {
		jvmArgs = append(jvmArgs, fmt.Sprintf("-Xms%dM", m.jvmMinRAM))
	}
	if m.jvmMaxRAM > 0 {
		jvmArgs = append(jvmArgs, fmt.Sprintf("-Xmx%dM", m.jvmMaxRAM))
	}

	if len(jvmArgs) > 0 {
		args = append(args, fmt.Sprintf("--jvm-arg=%s", strings.Join(jvmArgs, ",")))
	}

	cmd := exec.CommandContext(ctx, m.bin, args...)
	
	return m.executeWithLogging(cmd)
}

func (m *Mc) executeWithLogging(cmd *exec.Cmd) error {
	stdoutReader, stdoutWriter := io.Pipe()
	stderrReader, stderrWriter := io.Pipe()

	cmd.Stdout = stdoutWriter
	cmd.Stderr = stderrWriter


	if err := cmd.Start(); err != nil {
		return err
	}
	go readOutput(stdoutReader, m.l, false)
	go readOutput(stderrReader, m.l, true)
	if err := cmd.Wait(); err != nil {
		return err
	}
	return nil
}


func readOutput(reader io.Reader, l *logger.Logger, isErr bool) {
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		text := scanner.Text()
		if !isErr {
			l.Info("[MC] %s", text)
		} else {
			l.Error("[MC] %s", text)
		}
		
	}
}