package server

import (
	"fmt"

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
	app := fiber.New(fiber.Config{DisableStartupMessage: true, ReadBufferSize: 8192})
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{Format: "${time} | ${status} | ${latency} | ${ip} | ${method} | ${path}\n"}))
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
			l = "en"
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
	fmt.Printf("\n🚀 GoStreamix Engine is running!\n🌐 Control Panel: http://localhost:%s\n\n", s.Config.Port)
	return s.App.Listen(":" + s.Config.Port)
}
