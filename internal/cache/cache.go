package cache

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
)


type CacheManager struct {
	dir string
}

func New() *CacheManager {
	cache := &CacheManager{
		dir: ".cache",
	}
	os.MkdirAll(cache.dir, os.ModePerm)
	return cache
}

func exists(path string) bool {
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		return false

	}
	return true
}

func (c *CacheManager) getPath(key string) string {
	return fmt.Sprintf("%s/%s.json", c.dir, key)
}

func (c *CacheManager) Get(key string, ptr interface{}) error {
	path := c.getPath(key)
	if exists(path) {
		file, err := os.Open(path)
		if err != nil {
			return err
		}

		if err := json.NewDecoder(file).Decode(ptr); err != nil {
			return fmt.Errorf("failed to decode: %w", err)
		}

		return nil
	}
	return fmt.Errorf("file %s not found", path)
}

func (c *CacheManager) Put(key string, ptr interface{}) error {
	path := c.getPath(key)
	if exists(path) {
		if err := os.Remove(path); err != nil {
			return err
		}
	}
	file, err := os.Create(path)
	if err != nil {
		return err
	}

	if err := json.NewEncoder(file).Encode(ptr); err != nil {
		return err
	}

	return nil
}