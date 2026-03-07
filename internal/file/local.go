package file

import (
	"errors"
	"io"
	"os"
	"path/filepath"
)

type LocalBackend struct {
	RootPath string
}

func NewLocalBackend(rootPath string) StorageBackend {
	return &LocalBackend{
		RootPath: rootPath,
	}
}


func (l *LocalBackend) fullPath(path string) string {
	return filepath.Join(l.RootPath, path)
}

func (l *LocalBackend) Read(path string) (io.ReadCloser, error) {
	return os.Open(l.fullPath(path))
}

func (l *LocalBackend) ListDir(p string) ([]FileEntry, error) {
	entries, err := os.ReadDir(l.fullPath(p))
	if err != nil {
		return nil, err
	}

	var result []FileEntry
	for _, e := range entries {
		info, _ := e.Info()
		size := int64(0)
		if info != nil {
			size = info.Size()
		}
		
		result = append(result, FileEntry{
			Name:  e.Name(),
			IsDir: e.IsDir(),
			Size:  size,
		})
	}
	return result, nil
}

func (l *LocalBackend) Save(path string, data io.Reader) error {
	fPath := l.fullPath(path)
	
	if err := os.MkdirAll(filepath.Dir(fPath), 0755); err != nil {
		return err
	}

	out, err := os.Create(fPath)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, data)
	return err
}

func (l *LocalBackend) Delete(path string) error {
	return os.Remove(l.fullPath(path))
}

func (l *LocalBackend) Exists(path string) bool {
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		return false

	}
	return true
}