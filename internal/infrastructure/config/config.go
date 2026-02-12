package config

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"path/filepath"
)

type Config struct {
	Port, Host, DBPath, LogLevel, Secret, ProxyHeader, AppURL string
}

func NewConfig() *Config {
	dbPath := getEnv("DB_PATH", "data/gostreamix.sqlite")
	dataDir := filepath.Dir(dbPath)

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		keyPath := filepath.Join(dataDir, "app.key")
		if b, err := os.ReadFile(keyPath); err == nil {
			secret = string(b)
		} else {
			secret = generateSecret()
			_ = os.MkdirAll(dataDir, 0755)
			_ = os.WriteFile(keyPath, []byte(secret), 0600)
		}
	}

	return &Config{
		Port:        getEnv("PORT", "8080"),
		Host:        getEnv("HOST", "0.0.0.0"),
		DBPath:      dbPath,
		LogLevel:    getEnv("LOG_LEVEL", "info"),
		Secret:      secret,
		ProxyHeader: os.Getenv("PROXY_HEADER"),
		AppURL:      getEnv("APP_URL", "http://localhost:8080"),
	}
}

func getEnv(k, f string) string {
	if v, e := os.LookupEnv(k); e {
		return v
	}
	return f
}

func generateSecret() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}
