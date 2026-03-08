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
	"sync"
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
	args := []string{
		"--main-dir", path,
		"start",
		"--dry", 
		"--jvm-policy", "system-then-mojang",
		version,
	}
	m.l.Info("executing with args: %s", strings.Join(args, " "))
	cmd := exec.CommandContext(ctx, m.bin, args...)
	
	return m.executeWithLogging(cmd)
}


func (m *Mc) Run(ctx context.Context, instanceName, loader, loaderVersion, minecraftVersion, uuid, username string, isMicrosoft bool) error {
	path := fmt.Sprintf("%s/%s", m.instancesDir, utils.InstanceSlug(instanceName))
	version := fmt.Sprintf("%s:%s", loader, minecraftVersion)

	args := []string{
		"--main-dir", path,
		"--msa-db-file", "./msa-db.json",
		"start",
		"--username", username,
		"--uuid", uuid,
		"--jvm-policy", "system-then-mojang",
		version, 
	}

	if isMicrosoft {
		args = append(args, "--auth")
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

	m.l.Info("executing with args: %s", strings.Join(args, " "))
	cmd := exec.CommandContext(ctx, m.bin, args...)
	
	return m.executeWithLogging(cmd)
}

func (m *Mc) executeWithLogging(cmd *exec.Cmd) error {
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	var wg sync.WaitGroup
	wg.Add(2)
	go func() {
		defer wg.Done()
		readOutput(stdout, m.l, false)
	}()
	go func() {
		defer wg.Done()
		readOutput(stderr, m.l, true)
	}()
	wg.Wait()

	return cmd.Wait()
}


func readOutput(reader io.Reader, l *logger.Logger, isErr bool) {
	scanner := bufio.NewScanner(reader)
	scanner.Split(scanLinesOrCR)
	for scanner.Scan() {
		text := strings.TrimSpace(scanner.Text())
		if text == "" {
			continue
		}
		if !isErr {
			l.Info("[MC] %s", text)
		} else {
			l.Error("[MC] %s", text)
		}
	}
}

// scanLinesOrCR splits on \n, \r\n, or standalone \r so that
// carriage-return progress updates are forwarded immediately.
func scanLinesOrCR(data []byte, atEOF bool) (advance int, token []byte, err error) {
	if atEOF && len(data) == 0 {
		return 0, nil, nil
	}
	for i := 0; i < len(data); i++ {
		switch data[i] {
		case '\n':
			return i + 1, data[:i], nil
		case '\r':
			if i+1 < len(data) && data[i+1] == '\n' {
				return i + 2, data[:i], nil
			}
			return i + 1, data[:i], nil
		}
	}
	if atEOF {
		return len(data), data, nil
	}
	return 0, nil, nil
}