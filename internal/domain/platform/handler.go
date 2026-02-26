package platform

import (
	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Handler struct {
	svc     Service
	authSvc auth.Service
	log     *zap.Logger
}

func NewHandler(svc Service, authSvc auth.Service, log *zap.Logger) *Handler {
	return &Handler{svc: svc, authSvc: authSvc, log: log}
}

func (h *Handler) Routes(app *fiber.App) {
	api := app.Group("/api/platforms")
	api.Get("/", h.ApiGetPlatforms)
	api.Post("/", h.ApiCreatePlatform)
	api.Put("/:id", h.ApiUpdatePlatform)
	api.Delete("/:id", h.ApiDeletePlatform)
}

func (h *Handler) ApiGetPlatforms(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	platforms, err := h.svc.GetPlatforms(c.Context(), u.ID)
	if err != nil {
		h.log.Error("Failed to get platforms", zap.Error(err), zap.String("userID", u.ID.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to retrieve platforms"})
	}

	return c.JSON(platforms)
}

func (h *Handler) ApiCreatePlatform(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	var req CreatePlatformDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if err := req.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	p, err := h.svc.CreatePlatform(c.Context(), u.ID, req)
	if err != nil {
		h.log.Error("Failed to create platform", zap.Error(err), zap.String("userID", u.ID.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create platform"})
	}

	return c.Status(fiber.StatusCreated).JSON(p)
}

func (h *Handler) ApiDeletePlatform(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	if err := h.svc.DeletePlatform(c.Context(), id); err != nil {
		h.log.Error("Failed to delete platform", zap.Error(err), zap.String("platformID", id.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete platform"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ApiUpdatePlatform(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}

	var req UpdatePlatformDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	if err := req.Validate(); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	p, err := h.svc.UpdatePlatform(c.Context(), id, req)
	if err != nil {
		h.log.Error("Failed to update platform", zap.Error(err), zap.String("platformID", id.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update platform"})
	}

	return c.JSON(p)
}
