package file

import (
	"io"
	pathpkg "path"

	"github.com/jlaffaye/ftp"
)

type FtpBackend struct {
	Conn *ftp.ServerConn
	Root string
}

func (f *FtpBackend) ftpPath(p string) string {
	return pathpkg.Join(f.Root, p)
}

func (f *FtpBackend) Read(path string) (io.ReadCloser, error) {
	resp, err := f.Conn.Retr(f.ftpPath(path))
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func (f *FtpBackend) List(path string) ([]string, error) {
	entries, err := f.Conn.List(f.ftpPath(path))
	if err != nil {
		return nil, err
	}

	var names []string
	for _, e := range entries {
		if e.Name == "." || e.Name == ".." {
			continue
		}
		names = append(names, e.Name)
	}
	return names, nil
}

func (f *FtpBackend) Save(path string, data io.Reader) error {
	return f.Conn.Stor(f.ftpPath(path), data)
}

func (f *FtpBackend) Delete(path string) error {
	return f.Conn.Delete(f.ftpPath(path))
}