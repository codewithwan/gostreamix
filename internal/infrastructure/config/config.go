package config

import (
	"crypto/rand"
	"encoding/hex"
	"os"
	"path/filepath"
	"strconv"
)

type Config struct {
	Port, Host, DBPath, LogLevel, Secret, ProxyHeader, AppURL string

	// DemoMode serves a read-only public instance: all mutating requests are
	// rejected server-side and a demo account is auto-seeded on boot.
	DemoMode     bool
	DemoUsername string
	DemoPassword string

	// CORSOrigins restricts cross-origin API access. Defaults to the app's own
	// origin (AppURL); set to a comma-separated list (or "*") to override.
	CORSOrigins string
}

func NewConfig() *Config {
	dbPath := getEnv("DB_PATH", "data/db/gostreamix.sqlite")
	dataDir := filepath.Dir(dbPath)

	demoMode, _ := strconv.ParseBool(getEnv("DEMO_MODE", "false"))
	appURL := getEnv("APP_URL", "http://localhost:8080")

	corsOrigins := getEnv("CORS_ORIGINS", "")
	if corsOrigins == "" {
		corsOrigins = appURL
	}

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
		Port:         getEnv("PORT", "8080"),
		Host:         getEnv("HOST", "0.0.0.0"),
		DBPath:       dbPath,
		LogLevel:     getEnv("LOG_LEVEL", "info"),
		Secret:       secret,
		ProxyHeader:  os.Getenv("PROXY_HEADER"),
		AppURL:       appURL,
		DemoMode:     demoMode,
		DemoUsername: getEnv("DEMO_USERNAME", "demo"),
		DemoPassword: getEnv("DEMO_PASSWORD", "demostream123"),
		CORSOrigins:  corsOrigins,
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
