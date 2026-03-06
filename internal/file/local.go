package file

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type LocalManager struct {
	BasePath string
}


func NewLocalManager(basePath string) (Manager, error) {
	absPath, err := filepath.Abs(basePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get absolute path for %s: %w", basePath, err)
	}

	info, err := os.Stat(absPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("base path does not exist: %s", absPath)
		}
		return nil, fmt.Errorf("failed to get info about base path %s: %w", absPath, err)
	}

	if !info.IsDir() {
		return nil, fmt.Errorf("base path is not directory: %s", absPath)
	}

	return &LocalManager{BasePath: absPath,}, nil
}

func (m *LocalManager) resolvePath(relativePath string) (string, error) {
	cleanRelativePath := filepath.Clean(relativePath)
	fullPath := filepath.Join(m.BasePath, cleanRelativePath)

	if !strings.HasPrefix(fullPath, m.BasePath) {
		return "", fmt.Errorf("security, attempt to get file not from base path %s", relativePath)
	}

	return fullPath, nil
}

func (m *LocalManager) Get(path string) (io.Reader, error) {
	fullPath, err := m.resolvePath(path)
	if err != nil {
		return nil, err
	}

	data, err := os.Open(fullPath)
	if err != nil {
		return nil, err
	}

	return data, nil
}

func (m *LocalManager) Save(path string, data io.Reader) error {
	fullPath, err := m.resolvePath(path)
	if err != nil {
		return err
	}
	
	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return fmt.Errorf("failed to create root directories for %s: %w", fullPath, err)
	}

	file, err := os.Create(fullPath)
	if err != nil {
		return fmt.Errorf("failed to create file %s: %w", fullPath, err)
	}
	defer file.Close()

	if _, err := io.Copy(file, data); err != nil {
		return fmt.Errorf("failed to write data into file %s: %w", fullPath, err)
	}

	return nil
}

func (m *LocalManager) Delete(path string) error {
	fullPath, err := m.resolvePath(path)
	if err != nil {
		return err
	}

	if err := os.Remove(fullPath); err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("failed to delete file %s: %w", fullPath, err)
	}

	return nil
}