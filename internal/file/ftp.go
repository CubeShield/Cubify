package file

import (
	"io"
	pathpkg "path"
	"path/filepath"
	"strings"

	"github.com/jlaffaye/ftp"
)

type FtpBackend struct {
	Conn *ftp.ServerConn
	RootPath string
}

func NewFtpBackend(rootPath string, Conn *ftp.ServerConn) StorageBackend {
	return &FtpBackend{
		RootPath: rootPath,
		Conn: Conn,
	}
}


func (f *FtpBackend) ftpPath(p string) string {
	return pathpkg.Join(f.RootPath, p)
}

func (f *FtpBackend) Read(path string) (io.ReadCloser, error) {
	resp, err := f.Conn.Retr(f.ftpPath(path))
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (f *FtpBackend) ListDir(p string) ([]FileEntry, error) {
	entries, err := f.Conn.List(f.ftpPath(p))
	if err != nil {
		return nil, err
	}

	var result []FileEntry
	for _, e := range entries {
		if e.Name == "." || e.Name == ".." {
			continue
		}

		isDir := e.Type == ftp.EntryTypeFolder
		
		result = append(result, FileEntry{
			Name:  e.Name,
			IsDir: isDir,
			Size:  int64(e.Size),
		})
	}
	return result, nil
}

func (f *FtpBackend) ensureDir(dir string) error {
	if dir == "" || dir == "/" || dir == "." {
		return nil
	}

	parts := strings.Split(strings.Trim(dir, "/"), "/")
	current := ""
	if strings.HasPrefix(dir, "/") {
		current = "/"
	}

	for _, part := range parts {
		if current == "/" {
			current = "/" + part
		} else if current == "" {
			current = part
		} else {
			current = current + "/" + part
		}
		_ = f.Conn.MakeDir(current)
	}
	return nil
}

func (f *FtpBackend) Save(path string, data io.Reader) error {
	full := f.ftpPath(path)
	dir := pathpkg.Dir(full)
	if err := f.ensureDir(dir); err != nil {
		return err
	}
	return f.Conn.Stor(full, data)
}

func (f *FtpBackend) Delete(path string) error {
	return f.Conn.Delete(f.ftpPath(path))
}

func (f *FtpBackend) Exists(path string) bool {
	return false //TODO:
}

func (f *FtpBackend) Sub(path string) StorageBackend {
	return NewFtpBackend(filepath.Join(f.RootPath, path), f.Conn)
}

func (f *FtpBackend) BasePath() string {
	return f.RootPath
}