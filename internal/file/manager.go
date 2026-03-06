package file

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
)


type StorageBackend interface {
	Read(path string) (io.ReadCloser, error)
	List(path string) ([]string, error)
	Save(path string, data io.Reader) error
	Delete(path string) error
}

type Manager interface {
	Read(path string) (io.ReadCloser, error)
	List(path string) ([]string, error)
	Save(path string, data io.Reader) error
	Delete(path string) error

	SaveJson(path string, data any) error
	ReadJson(path string, ptr any) error
}

type fileManager struct {
	backend StorageBackend
}

func NewManager(backend StorageBackend) Manager {
	return &fileManager{backend: backend}
}

func (m *fileManager) Read(path string) (io.ReadCloser, error) {
	return m.backend.Read(path)
}

func (m *fileManager) List(path string) ([]string, error) {
	return m.backend.List(path)
}

func (m *fileManager) Save(path string, data io.Reader) error {
	return m.backend.Save(path, data)
}

func (m *fileManager) Delete(path string) error {
	return m.backend.Delete(path)
}


func (m *fileManager) SaveJson(path string, data any) error {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("json marshal error: %w", err)
	}
	
	reader := bytes.NewReader(jsonData)
	return m.Save(path, reader)
}


func (m *fileManager) ReadJson(path string, ptr any) error {
	reader, err := m.Read(path)
	if err != nil {
		return err
	}
	defer reader.Close()

	decoder := json.NewDecoder(reader)
	if err := decoder.Decode(ptr); err != nil {
		return fmt.Errorf("json decode error: %w", err)
	}
	return nil
}