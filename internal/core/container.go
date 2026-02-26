package core

import (
	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/domain/dashboard"
	"github.com/codewithwan/gostreamix/internal/domain/notification"
	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/codewithwan/gostreamix/internal/domain/stream"
	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/codewithwan/gostreamix/internal/infrastructure/config"
	"github.com/codewithwan/gostreamix/internal/infrastructure/database"
	"github.com/codewithwan/gostreamix/internal/infrastructure/logger"
	"github.com/codewithwan/gostreamix/internal/infrastructure/monitor"
	"github.com/codewithwan/gostreamix/internal/infrastructure/server"
	"github.com/codewithwan/gostreamix/internal/infrastructure/ws"
	"github.com/codewithwan/gostreamix/internal/shared/jwt"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/uptrace/bun"
	"go.uber.org/dig"
	"go.uber.org/zap"
)

func BuildContainer() *dig.Container {
	c := dig.New()

	c.Provide(config.NewConfig)
	c.Provide(logger.NewLogger)
	c.Provide(func(cfg *config.Config) struct{ Secret string } {
		return struct{ Secret string }{Secret: cfg.Secret}
	})
	c.Provide(func(cfg *config.Config, log *zap.Logger) (*bun.DB, error) {
		return database.NewSQLiteDB(cfg, log)
	})
	c.Provide(ws.NewHub)
	c.Provide(monitor.NewCollector)

	c.Provide(auth.NewRepository)
	c.Provide(auth.NewService)
	c.Provide(jwt.NewJWTService)
	c.Provide(middleware.NewAuthGuard)
	c.Provide(auth.NewHandler)

	c.Provide(stream.NewRepository)
	c.Provide(stream.NewService)
	c.Provide(stream.NewProcessManager)
	c.Provide(stream.NewPipeline)
	c.Provide(stream.NewHandler)

	c.Provide(video.NewRepository)
	c.Provide(video.NewService)
	c.Provide(video.NewHandler)

	c.Provide(platform.NewRepository)
	c.Provide(platform.NewService)
	c.Provide(platform.NewHandler)

	c.Provide(dashboard.NewService)
	c.Provide(dashboard.NewHandler)

	c.Provide(notification.NewRepository)
	c.Provide(notification.NewService)
	c.Provide(notification.NewHandler)

	c.Provide(server.NewServer)

	return c
}
