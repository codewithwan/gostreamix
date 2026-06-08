package server

import (
	"net/http"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/domain/dashboard"
	"github.com/codewithwan/gostreamix/internal/domain/notification"
	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/codewithwan/gostreamix/internal/domain/stream"
	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/codewithwan/gostreamix/internal/infrastructure/frontend"
	"github.com/codewithwan/gostreamix/internal/infrastructure/ws"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/filesystem"
	"go.uber.org/zap"
)

func registerStatic(app *fiber.App, log *zap.Logger) {
	app.Static("/assets", "./assets")
	app.Static("/main/assets", "./assets")
	app.Static("/thumbnails", "./data/thumbnails")

	frontendFS, err := frontend.StaticFS()
	if err != nil {
		log.Fatal("failed to load embedded frontend", zap.Error(err))
	}
	app.Use("/web", filesystem.New(filesystem.Config{Root: http.FS(frontendFS), PathPrefix: "", Browse: false}))
}

func registerDomainRoutes(app *fiber.App, handlers domainHandlers) {
	handlers.auth.Routes(app)
	handlers.dashboard.Routes(app)
	handlers.notification.Routes(app)
	handlers.stream.Routes(app)
	handlers.video.Routes(app)
	handlers.platform.Routes(app)
}

func registerWebRoutes(app *fiber.App, log *zap.Logger, hub *ws.Hub) {
	app.Get("/ws", ws.NewHandler(hub))
	app.Get("/health", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })
	app.Get("/", func(c *fiber.Ctx) error { return c.Redirect("/dashboard") })

	for _, path := range []string{"/setup", "/login", "/dashboard", "/streams", "/streams/:id/editor", "/videos", "/platforms", "/settings", "/activity"} {
		app.Get(path, serveSPA(log))
	}
}

func serveSPA(log *zap.Logger) fiber.Handler {
	return func(c *fiber.Ctx) error {
		indexHTML, err := frontend.ReadIndex()
		if err != nil {
			log.Error("failed to read embedded frontend index", zap.Error(err))
			return c.Status(fiber.StatusInternalServerError).SendString("frontend not available")
		}
		c.Type("html", "utf-8")
		return c.Send(indexHTML)
	}
}

type domainHandlers struct {
	auth         *auth.Handler
	dashboard    *dashboard.Handler
	notification *notification.Handler
	platform     *platform.Handler
	stream       *stream.Handler
	video        *video.Handler
}
