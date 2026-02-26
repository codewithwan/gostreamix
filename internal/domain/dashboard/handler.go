package dashboard

import (
	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/infrastructure/monitor"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

type Handler struct {
	authSvc auth.Service
	log     *zap.Logger
}

func NewHandler(authSvc auth.Service, log *zap.Logger) *Handler {
	return &Handler{authSvc: authSvc, log: log}
}

func (h *Handler) Routes(app *fiber.App) {
	api := app.Group("/api/dashboard")
	api.Get("/profile", h.ApiProfile)
	api.Get("/stats", h.ApiStats)
}

func (h *Handler) ApiProfile(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	return c.JSON(fiber.Map{
		"id":       u.ID,
		"username": u.Username,
		"email":    u.Email,
	})
}

func (h *Handler) ApiStats(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	return c.JSON(monitor.GetStats())
}
