package file

import (
	"io"
)

type Manager interface {
	//GetSHA256(path string) (string, error)
	Get(path string) (io.Reader, error)
	Save(path string, data io.Reader) error
	Delete(path string) error
}