package config

import (
	"encoding/json"
	"os"
)

type User struct {
	Username string `json:"username"`
	UUID string `json:"uuid"`
	AuthType string `json:"auth_type"`
}

type Config struct {
	Nickname string `json:"nickname"`
	IndexURL string `json:"index_url"`
	BaseURL string `json:"base_url"`
	AuthToken string `json:"auth_token"`

	CacheDirectory string `json:"cache_directory"`
	InstancesDirectory string `json:"instances_directory"`
	BinDirectory string `json:"bin_directory"`

	User User `json:"user"`
}


func Load(filename string) (*Config, error) {
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		defaultConfig := &Config{
			Nickname: "Lyroq1s",
			IndexURL: "https://raw.githubusercontent.com/CubeShield/CubeInstances/refs/heads/main/index.json",
			BaseURL: "https://api.github.com",
			AuthToken: "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",
			CacheDirectory: ".cache",
			InstancesDirectory: ".instances",
			BinDirectory: "bin",
		}
		
		if err := defaultConfig.Save(filename); err != nil {
			return nil, err
		}
		
		return defaultConfig, nil
	}

	data, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func (c *Config) Save(filename string) error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(filename, data, 0644)
}