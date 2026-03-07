package file

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"path"
)

type FileEntry struct {
	Name  string
	IsDir bool
	Size  int64
}

type TreeNode struct {
	Name     string      `json:"name"`
	Path     string      `json:"path"`
	IsDir    bool        `json:"is_dir"`
	Size     int64       `json:"size,omitempty"`
	Children []*TreeNode `json:"children,omitempty"`
}

type StorageBackend interface {
	Read(path string) (io.ReadCloser, error)
	ListDir(path string) ([]FileEntry, error) 
	Save(path string, data io.Reader) error
	Delete(path string) error
	Exists(path string) bool
}

type Manager interface {
	Read(path string) (io.ReadCloser, error)
	List(path string) ([]string, error)
	Tree(rootPath string, depth int) (*TreeNode, error)
	
	Save(path string, data io.Reader) error
	Delete(path string) error
	SaveJson(path string, data any) error
	ReadJson(path string, ptr any) error
	Exists(path string) bool
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

func (m *fileManager) List(p string) ([]string, error) {
	entries, err := m.backend.ListDir(p)
	if err != nil {
		return nil, err
	}
	var names []string
	for _, e := range entries {
		names = append(names, e.Name)
	}
	return names, nil
}

func (m *fileManager) Tree(rootPath string, maxDepth int) (*TreeNode, error) {
	root := &TreeNode{
		Name:  path.Base(rootPath),
		Path:  rootPath,
		IsDir: true,
	}
	
	err := m.buildTreeRecursive(root, rootPath, 0, maxDepth)
	if err != nil {
		return nil, err
	}
	
	return root, nil
}

func (m *fileManager) buildTreeRecursive(node *TreeNode, currentPath string, currentDepth int, maxDepth int) error {
	if maxDepth != -1 && currentDepth > maxDepth {
		return nil
	}

	entries, err := m.backend.ListDir(currentPath)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		childPath := path.Join(currentPath, entry.Name)

		childNode := &TreeNode{
			Name:  entry.Name,
			Path:  childPath,
			IsDir: entry.IsDir,
			Size:  entry.Size,
		}

		node.Children = append(node.Children, childNode)

		if entry.IsDir {
			err := m.buildTreeRecursive(childNode, childPath, currentDepth+1, maxDepth)
			if err != nil {
				fmt.Printf("Warning: failed to read dir %s: %v\n", childPath, err)
			}
		}
	}
	return nil
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

func (m *fileManager) Exists(path string) bool {
	return m.backend.Exists(path)
}