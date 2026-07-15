package server

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/codewithwan/gostreamix/internal/infrastructure/activity"
	"github.com/codewithwan/gostreamix/internal/infrastructure/config"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/csrf"
	"github.com/gofiber/fiber/v2/middleware/helmet"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func registerMiddleware(app *fiber.App, cfg *config.Config) {
	app.Use(recover.New())
	app.Use(helmet.New())
	app.Use(trackActivity)
	app.Use(cors.New(cors.Config{AllowOrigins: "*", AllowHeaders: "Origin, Content-Type, Accept, Authorization"}))
	app.Use(globalLimiter())
	if cfg.DemoMode {
		app.Use(demoGuard())
	}
	app.Use(csrfMiddleware(cfg.AppURL))
	registerAuthLimiters(app)
	app.Use(logger.New(logger.Config{
		Format:     "${time}	INFO	http request	{\"status\": ${status}, \"method\": \"${method}\", \"path\": \"${path}\", \"latency\": \"${latency}\", \"ip\": \"${ip}\"}\n",
		TimeFormat: "2006-01-02T15:04:05.000Z",
		TimeZone:   "UTC",
	}))
	app.Use(languageMiddleware)
}

func trackActivity(c *fiber.Ctx) error {
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
}

func globalLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        500,
		Expiration: 1 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			if wantsJSON(c) {
				return c.Status(429).JSON(fiber.Map{"error": "Too many requests"})
			}
			return c.Status(429).SendString("Too many requests. Please try again later.")
		},
	})
}

func csrfMiddleware(appURL string) fiber.Handler {
	return csrf.New(csrf.Config{
		Extractor: func(c *fiber.Ctx) (string, error) {
			if token := c.Get("X-CSRF-Token"); token != "" {
				return token, nil
			}
			return c.FormValue("csrf"), nil
		},
		CookieName:     "csrf_",
		CookieSameSite: "Lax",
		CookieSecure:   strings.HasPrefix(appURL, "https"),
		CookieHTTPOnly: true,
		Expiration:     1 * time.Hour,
		ContextKey:     "csrf",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			if wantsJSON(c) {
				return c.Status(403).JSON(fiber.Map{"error": "Invalid CSRF Token"})
			}
			return c.Redirect("/login")
		},
	})
}

func registerAuthLimiters(app *fiber.App) {
	loginLimiter := authLimiter(15)
	setupLimiter := authLimiter(10)
	app.Use("/login", loginLimiter)
	app.Use("/api/auth/login", loginLimiter)
	app.Use("/setup", setupLimiter)
	app.Use("/api/auth/setup", setupLimiter)
}

func authLimiter(max int) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:          max,
		Expiration:   1 * time.Minute,
		LimitReached: rateLimitResponse,
		KeyGenerator: func(c *fiber.Ctx) string { return c.IP() },
	})
}

func rateLimitResponse(c *fiber.Ctx) error {
	if wantsJSON(c) {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "Too many requests. Please try again later."})
	}
	return c.Status(fiber.StatusTooManyRequests).SendString("Too many requests. Please try again later.")
}

// demoGuard enforces the read-only public demo at the server level: any request
// that would mutate state (or trigger real work like the speedtest) is rejected
// with 403, regardless of what the UI allows. Only the auth flows the demo needs
// stay open.
func demoGuard() fiber.Handler {
	return func(c *fiber.Ctx) error {
		if isDemoBlocked(c.Method(), c.Path()) {
			if wantsJSON(c) {
				return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "This action is disabled in demo mode"})
			}
			return c.Status(fiber.StatusForbidden).SendString("This action is disabled in demo mode")
		}
		return c.Next()
	}
}

func isDemoBlocked(method, path string) bool {
	// Read-style endpoints that still perform real work are blocked explicitly.
	if path == "/ws/speedtest" {
		return true
	}

	switch method {
	case fiber.MethodGet, fiber.MethodHead, fiber.MethodOptions:
		return false
	}

	// Mutating methods: allow only the auth flows the demo login needs.
	switch path {
	case "/api/auth/login", "/api/auth/logout", "/api/auth/session", "/api/auth/refresh":
		return false
	}
	return true
}

func languageMiddleware(c *fiber.Ctx) error {
	lang := c.Query("lang")
	if lang != "" {
		c.Cookie(&fiber.Cookie{Name: "lang", Value: lang})
	} else {
		lang = c.Cookies("lang", "en")
	}
	c.Locals("lang", lang)
	return c.Next()
}

func wantsJSON(c *fiber.Ctx) bool {
	return strings.HasPrefix(c.Path(), "/api/") || strings.Contains(c.Get("Accept"), "application/json")
}
