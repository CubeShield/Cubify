package filesystem

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type FileManager struct {
	BasePath string
}

func NewFileManager(basePath string) (*FileManager, error) {
	absPath, err := filepath.Abs(basePath)
	if err != nil {
		return nil, fmt.Errorf("не удалось получить абсолютный путь для %s: %w", basePath, err)
	}

	info, err := os.Stat(absPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("базовая директория не существует: %s", absPath)
		}
		return nil, fmt.Errorf("не удалось получить информацию о пути %s: %w", absPath, err)
	}

	if !info.IsDir() {
		return nil, fmt.Errorf("указанный базовый путь не является директорией: %s", absPath)
	}

	return &FileManager{BasePath: absPath}, nil
}

func (fm *FileManager) resolvePath(relativePath string) (string, error) {
	cleanRelativePath := filepath.Clean(relativePath)
	fullPath := filepath.Join(fm.BasePath, cleanRelativePath)

	if !strings.HasPrefix(fullPath, fm.BasePath) {
		return "", fmt.Errorf("ошибка безопасности: попытка доступа к файлу вне базовой директории: %s", relativePath)
	}

	return fullPath, nil
}


func (fm *FileManager) Save(relativePath string, data io.Reader) error {
	fullPath, err := fm.resolvePath(relativePath)
	if err != nil {
		return err
	}
	
	if err := os.MkdirAll(filepath.Dir(fullPath), 0755); err != nil {
		return fmt.Errorf("не удалось создать родительские директории для %s: %w", fullPath, err)
	}

	file, err := os.Create(fullPath)
	if err != nil {
		return fmt.Errorf("не удалось создать файл %s: %w", fullPath, err)
	}
	defer file.Close()

	if _, err := io.Copy(file, data); err != nil {
		return fmt.Errorf("не удалось записать данные в файл %s: %w", fullPath, err)
	}

	return nil
}

func (fm *FileManager) Delete(relativePath string) error {
	fullPath, err := fm.resolvePath(relativePath)
	if err != nil {
		return err
	}

	if err := os.Remove(fullPath); err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("не удалось удалить файл %s: %w", fullPath, err)
	}

	return nil
}