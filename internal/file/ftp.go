package file

import (
	"io"
	pathpkg "path"

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

func (f *FtpBackend) Save(path string, data io.Reader) error {
	return f.Conn.Stor(f.ftpPath(path), data)
}

func (f *FtpBackend) Delete(path string) error {
	return f.Conn.Delete(f.ftpPath(path))
}