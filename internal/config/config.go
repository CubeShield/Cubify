package config

import (
	"Cubify/internal/file"
	"Cubify/internal/utils"
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
	IndexURLs []string `json:"index_urls"`
	BaseURL string `json:"base_url"`
	AuthToken string `json:"auth_token"`
	CurseForgeAPIKey string `json:"curseforge_api_key"`
	JVMPath string `json:"jvm_path"`
	JVMMinRAM int `json:"jvm_min_ram"`
	JVMMaxRAM int `json:"jvm_max_ram"`

	CubifyDirectory string `json:"cubify_directory"`

	BuildType string `json:"build_type"`

	FTP FTPSettings `json:"ftp"`

	DevMode bool `json:"dev_mode"`

	User User `json:"user"`
}


func defaultConfig() *Config {
	return &Config{
			IndexURLs: []string{"https://raw.githubusercontent.com/CubeShield/CubeInstances/refs/heads/main/index.json"},
			BaseURL: "https://api.github.com",
			AuthToken: "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",
			CurseForgeAPIKey: "$2a$10$mwWdWOppKD0R9/BlrO5XbeYXXaW.VpIzv3ZT/JQmzt2uXDaDbTM7S",
			CubifyDirectory: utils.GetBaseDir(),
			BuildType: "client",
			JVMMinRAM: 512,
			JVMMaxRAM: 2048,
			FTP: FTPSettings{
				Port: 21,
			},
		}
}

const configPath = "config.json"

func Load(fm file.Manager) (*Config, error) {
	if !fm.Exists(configPath) {
		defaultConfig := defaultConfig()
		if err := fm.SaveJson(configPath, defaultConfig); err != nil {
			return nil, err
		}

		return defaultConfig, nil
	}

	var cfg Config
	if err := fm.ReadJson(configPath, &cfg); err != nil {
		return nil, err
	}

	return &cfg, nil
}

func (c *Config) Save(fm file.Manager) error {
	if err := fm.SaveJson(configPath, c); err != nil {
		return err
	}

	return nil
}