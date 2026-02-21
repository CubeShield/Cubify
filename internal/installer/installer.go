package installer

import (
	"archive/tar"
	"archive/zip"
	"compress/gzip"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

const (
	PortableMcVersion = "5.0.2"
	BaseURL           = "https://github.com/mindstorm38/portablemc/releases/download/v%s/%s"
)

type Installer struct {
	dir string
}

func New(binDir string) *Installer {
	if err := os.MkdirAll(binDir, 0755); err != nil {
		fmt.Printf("Error creating dir: %v\n", err)
	}
	return &Installer{
		dir: binDir,
	}
}

func (i *Installer) GetExecutablePath() string {
	exeName := "portablemc"
	if runtime.GOOS == "windows" {
		exeName += ".exe"
	}
	return filepath.Join(i.dir, exeName)
}


func (i *Installer) RetrievePortableMC() error {
	destPath := i.GetExecutablePath()

	if _, err := os.Stat(destPath); err == nil {
		return nil 
	}

	filename, err := getAssetFilename()
	if err != nil {
		return fmt.Errorf("failed to detect system: %w", err)
	}

	downloadURL := fmt.Sprintf(BaseURL, PortableMcVersion, filename)
	fmt.Printf("Downloading from: %s\n", downloadURL)

	tmpFile, err := os.CreateTemp("", "portablemc-*.archive")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %w", err)
	}
	defer os.Remove(tmpFile.Name())
	defer tmpFile.Close()

	resp, err := http.Get(downloadURL)
	if err != nil {
		return fmt.Errorf("failed to download: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	_, err = io.Copy(tmpFile, resp.Body)
	if err != nil {
		return fmt.Errorf("failed to save archive: %w", err)
	}

	tmpFile.Seek(0, 0)

	if strings.HasSuffix(filename, ".zip") {
		err = i.extractZip(tmpFile, destPath)
	} else {
		err = i.extractTarGz(tmpFile, destPath)
	}

	if err != nil {
		return fmt.Errorf("failed to extract: %w", err)
	}

	if runtime.GOOS != "windows" {
		if err := os.Chmod(destPath, 0755); err != nil {
			return fmt.Errorf("failed to chmod: %w", err)
		}
	}

	return nil
}

func getAssetFilename() (string, error) {
	osType := runtime.GOOS
	arch := runtime.GOARCH

	var archName string
	switch arch {
	case "amd64":
		archName = "x86_64"
	case "386":
		archName = "i686"
	case "arm64":
		archName = "aarch64"
	case "arm":
		archName = "arm"
	default:
		return "", fmt.Errorf("unsupported architecture: %s", arch)
	}

	switch osType {
	case "windows":
		return fmt.Sprintf("portablemc-%s-windows-%s-msvc.zip", PortableMcVersion, archName), nil
	case "darwin":
		return fmt.Sprintf("portablemc-%s-macos-%s.tar.gz", PortableMcVersion, archName), nil
	case "linux":
		suffix := "gnu"
		if arch == "arm" {
			suffix = "gnueabihf"
		}
		return fmt.Sprintf("portablemc-%s-linux-%s-%s.tar.gz", PortableMcVersion, archName, suffix), nil
	default:
		return "", fmt.Errorf("unsupported OS: %s", osType)
	}
}

func (i *Installer) extractZip(archiveFile *os.File, destPath string) error {
	stat, _ := archiveFile.Stat()
	zipReader, err := zip.NewReader(archiveFile, stat.Size())
	if err != nil {
		return err
	}

	for _, f := range zipReader.File {
		if strings.HasSuffix(f.Name, ".exe") || f.Name == "portablemc" {
			rc, err := f.Open()
			if err != nil {
				return err
			}
			defer rc.Close()

			outFile, err := os.Create(destPath)
			if err != nil {
				return err
			}
			defer outFile.Close()

			_, err = io.Copy(outFile, rc)
			return err
		}
	}
	return fmt.Errorf("executable not found in zip")
}

func (i *Installer) extractTarGz(archiveFile io.Reader, destPath string) error {
	gzReader, err := gzip.NewReader(archiveFile)
	if err != nil {
		return err
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)

	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		if header.Typeflag == tar.TypeReg && filepath.Base(header.Name) == "portablemc" {
			outFile, err := os.Create(destPath)
			if err != nil {
				return err
			}
			defer outFile.Close()

			if _, err := io.Copy(outFile, tarReader); err != nil {
				return err
			}
			return nil
		}
	}
	return fmt.Errorf("executable not found in tar.gz")
}