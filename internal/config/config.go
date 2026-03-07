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

type FTPSettings struct {
	Host     string `json:"host"`
	Port     int    `json:"port"`
	User     string `json:"user"`
	Password string `json:"password"`
	RootPath string `json:"root_path"`
}

type Config struct {
	Nickname string `json:"nickname"`
	IndexURLs []string `json:"index_urls"`
	BaseURL string `json:"base_url"`
	AuthToken string `json:"auth_token"`
	CurseForgeAPIKey string `json:"curseforge_api_key"`
	JVMPath string `json:"jvm_path"`
	JVMMinRAM int `json:"jvm_min_ram"`
	JVMMaxRAM int `json:"jvm_max_ram"`

	CacheDirectory string `json:"cache_directory"`
	InstancesDirectory string `json:"instances_directory"`
	BinDirectory string `json:"bin_directory"`
	EditorDirectory string `json:"editor_directory"`

	BuildType string `json:"build_type"`

	FTP FTPSettings `json:"ftp"`

	DevMode bool `json:"dev_mode"`

	User User `json:"user"`
}


func Load(filename string) (*Config, error) {
	if _, err := os.Stat(filename); os.IsNotExist(err) {
		defaultConfig := &Config{
			Nickname: "Lyroq1s",
			IndexURLs: []string{"https://raw.githubusercontent.com/CubeShield/CubeInstances/refs/heads/main/index.json"},
			BaseURL: "https://api.github.com",
			AuthToken: "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",
			CurseForgeAPIKey: "$2a$10$mwWdWOppKD0R9/BlrO5XbeYXXaW.VpIzv3ZT/JQmzt2uXDaDbTM7S",
			CacheDirectory: ".cache",
			InstancesDirectory: ".instances",
			BinDirectory: "bin",
			EditorDirectory: "editor",
			BuildType: "client",
			JVMMinRAM: 512,
			JVMMaxRAM: 2048,
			FTP: FTPSettings{
				Port: 21,
			},
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