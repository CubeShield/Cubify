package file

import (
	"io"
	pathpkg "path"

	"github.com/pkg/sftp"
)

type SftpBackend struct {
	Client   *sftp.Client
	RootPath string
}

func NewSftpBackend(rootPath string, client *sftp.Client) StorageBackend {
	return &SftpBackend{
		RootPath: rootPath,
		Client:   client,
	}
}

func (s *SftpBackend) sftpPath(p string) string {
	return pathpkg.Join(s.RootPath, p)
}

func (s *SftpBackend) Read(path string) (io.ReadCloser, error) {
	f, err := s.Client.Open(s.sftpPath(path))
	if err != nil {
		return nil, err
	}
	return f, nil
}

func (s *SftpBackend) ListDir(p string) ([]FileEntry, error) {
	infos, err := s.Client.ReadDir(s.sftpPath(p))
	if err != nil {
		return nil, err
	}

	var result []FileEntry
	for _, info := range infos {
		name := info.Name()
		if name == "." || name == ".." {
			continue
		}

		result = append(result, FileEntry{
			Name:  name,
			IsDir: info.IsDir(),
			Size:  info.Size(),
		})
	}
	return result, nil
}

func (s *SftpBackend) Save(path string, data io.Reader) error {
	full := s.sftpPath(path)
	dir := pathpkg.Dir(full)
	if dir != "" && dir != "." {
		if err := s.Client.MkdirAll(dir); err != nil {
			return err
		}
	}

	f, err := s.Client.Create(full)
	if err != nil {
		return err
	}
	defer f.Close()

	if _, err := io.Copy(f, data); err != nil {
		return err
	}
	return nil
}

func (s *SftpBackend) Delete(path string) error {
	return s.Client.Remove(s.sftpPath(path))
}

func (s *SftpBackend) Exists(path string) bool {
	_, err := s.Client.Stat(s.sftpPath(path))
	return err == nil
}

func (s *SftpBackend) Sub(path string) StorageBackend {
	return NewSftpBackend(pathpkg.Join(s.RootPath, path), s.Client)
}

func (s *SftpBackend) BasePath() string {
	return s.RootPath
}
