package config

import "os"

type Config struct {
	Port, DBPath, LogLevel, Secret string
}

func NewConfig() *Config {
	return &Config{
		Port:     getEnv("PORT", "8080"),
		DBPath:   getEnv("DB_PATH", "data/db/gostreamix.sqlite"),
		LogLevel: getEnv("LOG_LEVEL", "info"),
		Secret:   getEnv("JWT_SECRET", "super-secret-key"),
	}
}

func getEnv(k, f string) string {
	if v, e := os.LookupEnv(k); e {
		return v
	}
	return f
}
