package core

import (
	"os"

	"github.com/codewithwan/gostreamix/internal/auth"
	"github.com/codewithwan/gostreamix/internal/config"
	"github.com/codewithwan/gostreamix/internal/dashboard"
	"github.com/codewithwan/gostreamix/internal/server"
	"github.com/codewithwan/gostreamix/internal/storage"
	"go.uber.org/dig"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

func BuildContainer() *dig.Container {
	c := dig.New()
	_ = c.Provide(config.NewConfig)
	_ = c.Provide(func(cfg *config.Config) (*zap.Logger, error) {
		ec := zap.NewDevelopmentEncoderConfig()
		ec.EncodeTime = zapcore.ISO8601TimeEncoder
		return zap.New(zapcore.NewCore(zapcore.NewConsoleEncoder(ec), zapcore.AddSync(os.Stdout), zap.InfoLevel)), nil
	})
	_ = c.Provide(func(cfg *config.Config) struct{ Secret string } {
		return struct{ Secret string }{Secret: cfg.Secret}
	})
	_ = c.Provide(storage.NewSQLiteDB)
	_ = c.Provide(auth.NewRepository)
	_ = c.Provide(auth.NewService)
	_ = c.Provide(auth.NewJWTService)
	_ = c.Provide(auth.NewGuard)
	_ = c.Provide(auth.NewHandler)
	_ = c.Provide(dashboard.NewHandler)
	_ = c.Provide(server.NewServer)
	return c
}
