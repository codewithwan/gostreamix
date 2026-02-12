package core

import (
	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/domain/dashboard"
	"github.com/codewithwan/gostreamix/internal/domain/stream"
	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/codewithwan/gostreamix/internal/infrastructure/config"
	"github.com/codewithwan/gostreamix/internal/infrastructure/database"
	"github.com/codewithwan/gostreamix/internal/infrastructure/logger"
	"github.com/codewithwan/gostreamix/internal/infrastructure/server"
	"github.com/codewithwan/gostreamix/internal/shared/jwt"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/uptrace/bun"
	"go.uber.org/dig"
	"go.uber.org/zap"
)

func BuildContainer() *dig.Container {
	c := dig.New()
	_ = c.Provide(config.NewConfig)
	_ = c.Provide(logger.NewLogger)
	_ = c.Provide(func(cfg *config.Config) struct{ Secret string } {
		return struct{ Secret string }{Secret: cfg.Secret}
	})
	_ = c.Provide(func(cfg *config.Config, log *zap.Logger) (*bun.DB, error) {
		return database.NewSQLiteDB(cfg, log)
	})

	_ = c.Provide(auth.NewRepository)
	_ = c.Provide(auth.NewService)
	_ = c.Provide(jwt.NewJWTService)
	_ = c.Provide(middleware.NewAuthGuard)
	_ = c.Provide(auth.NewHandler)

	_ = c.Provide(stream.NewRepository)
	_ = c.Provide(stream.NewService)
	_ = c.Provide(stream.NewPipeline)
	_ = c.Provide(stream.NewHandler)

	_ = c.Provide(video.NewRepository)
	_ = c.Provide(video.NewService)
	_ = c.Provide(video.NewHandler)

	_ = c.Provide(dashboard.NewService)
	_ = c.Provide(dashboard.NewHandler)

	_ = c.Provide(server.NewServer)

	return c
}
