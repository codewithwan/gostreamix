package notification

import (
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

type Handler struct {
	svc Service
	log *zap.Logger
}

func NewHandler(svc Service, log *zap.Logger) *Handler {
	return &Handler{svc: svc, log: log}
}

func (h *Handler) Routes(app *fiber.App) {
	api := app.Group("/api/settings/notifications")
	api.Get("/", h.ApiGetSettings)
	api.Put("/", h.ApiSaveSettings)
	api.Post("/test", h.ApiSendTest)
}

func (h *Handler) ApiGetSettings(c *fiber.Ctx) error {
	settings, err := h.svc.GetSettings(c.Context())
	if err != nil {
		h.log.Error("failed to get notification settings", zap.Error(err))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load notification settings"})
	}
	return c.JSON(settings)
}

func (h *Handler) ApiSaveSettings(c *fiber.Ctx) error {
	var dto SaveSettingsDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	settings, err := h.svc.SaveSettings(c.Context(), dto)
	if err != nil {
		h.log.Error("failed to save notification settings", zap.Error(err))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save notification settings"})
	}

	return c.JSON(settings)
}

func (h *Handler) ApiSendTest(c *fiber.Ctx) error {
	var req struct {
		Message string `json:"message"`
	}
	_ = c.BodyParser(&req)

	if err := h.svc.SendTest(c.Context(), req.Message); err != nil {
		h.log.Error("failed to send notification test", zap.Error(err))
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "test notification sent"})
}
