package utils

import (
	"os"
	"path/filepath"
	"runtime"
)

const appName = ".cubify"

func GetBaseDir() string {
	var basePath string
	var err error

	if runtime.GOOS == "windows" {
		basePath, err = os.UserConfigDir()
	} else {
		basePath, err = os.UserHomeDir()
	}

	if err != nil {
		return ""
	}

	return filepath.Join(basePath, appName)
}