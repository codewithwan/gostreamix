package dashboard

import (
	"strconv"
	"time"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/infrastructure/activity"
	"github.com/codewithwan/gostreamix/internal/infrastructure/monitor"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/uptrace/bun"
	"go.uber.org/zap"
)

type Handler struct {
	authSvc auth.Service
	db      *bun.DB
	log     *zap.Logger
}

func NewHandler(authSvc auth.Service, db *bun.DB, log *zap.Logger) *Handler {
	return &Handler{authSvc: authSvc, db: db, log: log}
}

func (h *Handler) Routes(app *fiber.App) {
	api := app.Group("/api/dashboard")
	api.Get("/profile", h.ApiProfile)
	api.Get("/stats", h.ApiStats)
	api.Get("/metrics", h.ApiMetrics)
	api.Get("/logs", h.ApiLogs)
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

func (h *Handler) ApiMetrics(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	minutes, _ := strconv.Atoi(c.Query("minutes", "60"))
	if minutes <= 0 {
		minutes = 60
	}
	if minutes > 360 {
		minutes = 360
	}

	since := time.Now().Add(-time.Duration(minutes) * time.Minute)
	history, err := monitor.GetHistory(c.Context(), h.db, since, 720)
	if err != nil {
		h.log.Error("failed to get metric history", zap.Error(err))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load metric history"})
	}

	return c.JSON(fiber.Map{"items": history})
}

func (h *Handler) ApiLogs(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page <= 0 {
		page = 1
	}

	perPage, _ := strconv.Atoi(c.Query("per_page", "30"))
	if perPage <= 0 {
		perPage = 30
	}
	if perPage > 500 {
		perPage = 500
	}

	result := activity.ListPage(page, perPage)
	return c.JSON(result)
}
