package server

import (
	"fmt"
	"strings"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/domain/dashboard"
	"github.com/codewithwan/gostreamix/internal/domain/stream"
	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/codewithwan/gostreamix/internal/infrastructure/config"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
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
	authH *auth.Handler,
	dashH *dashboard.Handler,
	streamH *stream.Handler,
	videoH *video.Handler,
) *Server {
	fiberConfig := fiber.Config{
		DisableStartupMessage: true,
		ReadBufferSize:        8192,
	}

	if cfg.ProxyHeader != "" {
		fiberConfig.ProxyHeader = cfg.ProxyHeader
	}

	app := fiber.New(fiberConfig)
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format:     "${time}	INFO	http request	{\"status\": ${status}, \"method\": \"${method}\", \"path\": \"${path}\", \"latency\": \"${latency}\", \"ip\": \"${ip}\"}\n",
		TimeFormat: "2006-01-02T15:04:05.000Z",
		TimeZone:   "UTC",
	}))
	app.Static("/assets", "./assets")

	app.Use(func(c *fiber.Ctx) error {
		lang := c.Query("lang")
		if lang != "" {
			c.Cookie(&fiber.Cookie{
				Name:  "lang",
				Value: lang,
			})
			path := c.Path()
			if len(c.Queries()) > 1 {
				return c.Redirect(path)
			}
			return c.Redirect(path)
		}

		l := c.Cookies("lang")
		if l == "" {
			accept := c.Get("Accept-Language")
			if strings.Contains(accept, "id") {
				l = "id"
			} else {
				l = "en"
			}
		}
		c.Locals("lang", l)
		return c.Next()
	})

	s := &Server{App: app, Config: cfg, Log: log}

	authH.Routes(app)
	dashH.Routes(app)
	streamH.Routes(app)
	videoH.Routes(app)

	app.Get("/", func(c *fiber.Ctx) error {
		return c.Redirect("/dashboard")
	})

	return s
}

func (s *Server) Start() error {
	addr := fmt.Sprintf("%s:%s", s.Config.Host, s.Config.Port)
	s.Log.Info("http server listening", zap.String("address", addr))
	return s.App.Listen(addr)
}
