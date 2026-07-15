package server

import (
	"context"
	"fmt"
	"strings"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/domain/dashboard"
	"github.com/codewithwan/gostreamix/internal/domain/notification"
	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/codewithwan/gostreamix/internal/domain/speedtest"
	"github.com/codewithwan/gostreamix/internal/domain/stream"
	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/codewithwan/gostreamix/internal/infrastructure/config"
	"github.com/codewithwan/gostreamix/internal/infrastructure/monitor"
	"github.com/codewithwan/gostreamix/internal/infrastructure/ws"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

type Server struct {
	App    *fiber.App
	Config *config.Config
	Log    *zap.Logger
}

func NewServer(
	cfg *config.Config,
	log *zap.Logger,
	hub *ws.Hub,
	authH *auth.Handler,
	dashH *dashboard.Handler,
	notifH *notification.Handler,
	streamH *stream.Handler,
	videoH *video.Handler,
	platformH *platform.Handler,
	speedtestH *speedtest.Handler,
	collector *monitor.Collector,
) *Server {
	fiberConfig := fiber.Config{
		DisableStartupMessage: true,
		ReadBufferSize:        8192,
		BodyLimit:             int(video.MaxUploadBytes),
	}

	if cfg.ProxyHeader != "" {
		fiberConfig.ProxyHeader = cfg.ProxyHeader
	}

	app := fiber.New(fiberConfig)
	registerStatic(app, log)
	registerMiddleware(app, cfg)

	s := &Server{App: app, Config: cfg, Log: log}
	collector.Start(context.Background())

	registerDomainRoutes(app, domainHandlers{
		auth:         authH,
		dashboard:    dashH,
		notification: notifH,
		stream:       streamH,
		video:        videoH,
		platform:     platformH,
		speedtest:    speedtestH,
	})
	registerWebRoutes(app, log, hub)

	return s
}

func (s *Server) Start() error {
	addr := fmt.Sprintf("%s:%s", s.Config.Host, s.Config.Port)
	s.Log.Info("http server listening", zap.String("address", addr))
	return s.App.Listen(addr)
}

func shouldTrackActivityPath(path string) bool {
	if path == "/health" {
		return false
	}
	if path == "/api/dashboard/logs" {
		return false
	}

	if strings.HasPrefix(path, "/assets") ||
		strings.HasPrefix(path, "/web/") ||
		strings.HasPrefix(path, "/ws") ||
		strings.HasPrefix(path, "/thumbnails") {
		return false
	}

	return true
}

func activityLevelFromStatus(status int) string {
	if status >= fiber.StatusInternalServerError {
		return "error"
	}
	if status >= fiber.StatusBadRequest {
		return "warning"
	}
	return "info"
}
