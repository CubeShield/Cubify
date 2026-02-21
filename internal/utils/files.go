package utils

import (
	"errors"
	"os"
)

func Exists(path string) bool {
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		return false

	}
	return true
}