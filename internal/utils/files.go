package utils

import (
	"errors"
	"os"
	"strings"
)

func Exists(path string) bool {
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		return false

	}
	return true
}

func InstanceSlug(val string) string {
	return strings.Map(func(r rune) rune {
		switch {
		case r >= 'a' && r <= 'z':
			return r
		case r >= 'A' && r <= 'Z':
			return r
		case r >= '0' && r <= '9':
			return r
		case r >= 'а' && r <= 'я':
			return r
		case r >= 'А' && r <= 'Я':
			return r
		case r == 'ё' || r == 'Ё':
			return r
		case r == '_':
			return r
		default:
			return -1
		}
	}, val)
}