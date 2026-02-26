package server

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/domain/dashboard"
	"github.com/codewithwan/gostreamix/internal/domain/notification"
	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/codewithwan/gostreamix/internal/domain/stream"
	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/codewithwan/gostreamix/internal/infrastructure/activity"
	"github.com/codewithwan/gostreamix/internal/infrastructure/config"
	"github.com/codewithwan/gostreamix/internal/infrastructure/frontend"
	"github.com/codewithwan/gostreamix/internal/infrastructure/monitor"
	"github.com/codewithwan/gostreamix/internal/infrastructure/ws"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/csrf"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
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
	hub *ws.Hub,
	authH *auth.Handler,
	dashH *dashboard.Handler,
	notifH *notification.Handler,
	streamH *stream.Handler,
	videoH *video.Handler,
	platformH *platform.Handler,
	collector *monitor.Collector,
) *Server {
	fiberConfig := fiber.Config{
		DisableStartupMessage: true,
		ReadBufferSize:        8192,
	}

	if cfg.ProxyHeader != "" {
		fiberConfig.ProxyHeader = cfg.ProxyHeader
	}

	app := fiber.New(fiberConfig)

	app.Static("/assets", "./assets")
	app.Static("/thumbnails", "./data/thumbnails")
	app.Static("/uploads", "./data/uploads")

	frontendFS, err := frontend.StaticFS()
	if err != nil {
		log.Fatal("failed to load embedded frontend", zap.Error(err))
	}

	app.Use("/web", filesystem.New(filesystem.Config{
		Root:       http.FS(frontendFS),
		PathPrefix: "",
		Browse:     false,
	}))

	app.Use(recover.New())
	app.Use(helmet.New())
	app.Use(func(c *fiber.Ctx) error {
		startedAt := time.Now()
		err := c.Next()

		if shouldTrackActivityPath(c.Path()) {
			status := c.Response().StatusCode()
			statusText := http.StatusText(status)
			activity.Record(activity.Entry{
				Timestamp:  time.Now().UTC(),
				Source:     "http",
				Level:      activityLevelFromStatus(status),
				Event:      "request",
				Message:    fmt.Sprintf("%s %s -> %d %s", c.Method(), c.Path(), status, statusText),
				Method:     c.Method(),
				Path:       c.Path(),
				Status:     status,
				LatencyMS:  time.Since(startedAt).Milliseconds(),
				IP:         c.IP(),
				UserAgent:  c.Get("User-Agent"),
				IsAPI:      strings.HasPrefix(c.Path(), "/api/"),
				RequestID:  c.GetRespHeader("X-Request-ID"),
				StatusText: statusText,
			})
		}

		return err
	})
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// Global Limiter
	app.Use(limiter.New(limiter.Config{
		Max:        500,
		Expiration: 1 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			if strings.HasPrefix(c.Path(), "/api/") || strings.Contains(c.Get("Accept"), "application/json") {
				return c.Status(429).JSON(fiber.Map{"error": "Too many requests"})
			}
			return c.Status(429).SendString("Too many requests. Please try again later.")
		},
	}))

	app.Use(csrf.New(csrf.Config{
		Extractor: func(c *fiber.Ctx) (string, error) {
			token := c.Get("X-CSRF-Token")
			if token == "" {
				token = c.FormValue("csrf")
			}
			return token, nil
		},
		CookieName:     "csrf_",
		CookieSameSite: "Lax",
		CookieSecure:   strings.HasPrefix(cfg.AppURL, "https"),
		CookieHTTPOnly: true,
		Expiration:     1 * time.Hour,
		ContextKey:     "csrf",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			if strings.HasPrefix(c.Path(), "/api/") || strings.Contains(c.Get("Accept"), "application/json") {
				return c.Status(403).JSON(fiber.Map{"error": "Invalid CSRF Token"})
			}
			return c.Redirect("/login")
		},
	}))

	limitHandler := func(c *fiber.Ctx) error {
		if strings.HasPrefix(c.Path(), "/api/") || strings.Contains(c.Get("Accept"), "application/json") {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Too many requests. Please try again later."})
		}

		return c.Status(fiber.StatusTooManyRequests).SendString("Too many requests. Please try again later.")
	}

	loginLimiter := limiter.New(limiter.Config{
		Max:          15,
		Expiration:   1 * time.Minute,
		LimitReached: limitHandler,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
	})

	setupLimiter := limiter.New(limiter.Config{
		Max:          10,
		Expiration:   1 * time.Minute,
		LimitReached: limitHandler,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
	})

	app.Use("/login", loginLimiter)
	app.Use("/api/auth/login", loginLimiter)
	app.Use("/setup", setupLimiter)
	app.Use("/api/auth/setup", setupLimiter)

	app.Use(logger.New(logger.Config{
		Format:     "${time}	INFO	http request	{\"status\": ${status}, \"method\": \"${method}\", \"path\": \"${path}\", \"latency\": \"${latency}\", \"ip\": \"${ip}\"}\n",
		TimeFormat: "2006-01-02T15:04:05.000Z",
		TimeZone:   "UTC",
	}))

	app.Get("/ws", ws.NewHandler(hub))

	app.Use(func(c *fiber.Ctx) error {
		l := c.Query("lang")
		if l != "" {
			c.Cookie(&fiber.Cookie{
				Name:  "lang",
				Value: l,
			})
		} else {
			l = c.Cookies("lang", "en")
		}
		c.Locals("lang", l)
		return c.Next()
	})

	s := &Server{App: app, Config: cfg, Log: log}
	collector.Start(context.Background())

	authH.Routes(app)
	dashH.Routes(app)
	notifH.Routes(app)
	streamH.Routes(app)
	videoH.Routes(app)
	platformH.Routes(app)

	serveSPA := func(c *fiber.Ctx) error {
		indexHTML, readErr := frontend.ReadIndex()
		if readErr != nil {
			log.Error("failed to read embedded frontend index", zap.Error(readErr))
			return c.Status(fiber.StatusInternalServerError).SendString("frontend not available")
		}

		c.Type("html", "utf-8")
		return c.Send(indexHTML)
	}

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	app.Get("/", func(c *fiber.Ctx) error {
		return c.Redirect("/dashboard")
	})
	app.Get("/setup", serveSPA)
	app.Get("/login", serveSPA)
	app.Get("/dashboard", serveSPA)
	app.Get("/streams", serveSPA)
	app.Get("/streams/:id/editor", serveSPA)
	app.Get("/videos", serveSPA)
	app.Get("/platforms", serveSPA)
	app.Get("/settings", serveSPA)
	app.Get("/activity", serveSPA)

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
		strings.HasPrefix(path, "/uploads") ||
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
