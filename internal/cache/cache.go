package cache

import (
	"Cubify/internal/file"
	"fmt"
)


type CacheManager struct {
	fm file.Manager
}

func New(fm file.Manager) *CacheManager {
	cache := &CacheManager{
		fm: fm,
	}
	return cache
}

func (c *CacheManager) getFile(key string) string {
	return fmt.Sprintf("%s.json", key)
}

func (c *CacheManager) Get(key string, ptr interface{}) error {
	file := c.getFile(c.getFile(key))
	if c.fm.Exists(file) {
		return c.fm.ReadJson(file, ptr)
	}

	return fmt.Errorf("file %s not found", file)
}

func (c *CacheManager) Put(key string, ptr interface{}) error {
	file := c.getFile(c.getFile(key))
	return c.fm.SaveJson(file, ptr)
}