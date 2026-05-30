package notification

import (
	"fmt"
	"time"

	"github.com/codewithwan/gostreamix/internal/infrastructure/activity"
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
	api.Post("/telegram/chats", h.ApiDetectTelegramChats)
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
	var req SendTestDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	result, err := h.svc.SendTest(c.Context(), req)
	if err != nil {
		h.log.Error("failed to send notification test", zap.Error(err))
		activity.Record(activity.Entry{
			Timestamp: time.Now().UTC(),
			Source:    "notification",
			Level:     "error",
			Event:     "notification_test_failed",
			Message:   fmt.Sprintf("Notification test failed for %s: %s", req.Channel, err.Error()),
			IP:        c.IP(),
			UserAgent: c.Get("User-Agent"),
		})
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	activity.Record(activity.Entry{
		Timestamp: time.Now().UTC(),
		Source:    "notification",
		Level:     "info",
		Event:     "notification_test_sent",
		Message:   fmt.Sprintf("Notification test sent to %s", result.Channel),
		IP:        c.IP(),
		UserAgent: c.Get("User-Agent"),
	})

	return c.JSON(fiber.Map{
		"message": "test notification sent",
		"test":    result,
	})
}

func (h *Handler) ApiDetectTelegramChats(c *fiber.Ctx) error {
	var req DetectTelegramChatsDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	chats, err := h.svc.DetectTelegramChats(c.Context(), req)
	if err != nil {
		h.log.Error("failed to detect telegram chats", zap.Error(err))
		activity.Record(activity.Entry{
			Timestamp: time.Now().UTC(),
			Source:    "notification",
			Level:     "warning",
			Event:     "telegram_chats_detect_failed",
			Message:   fmt.Sprintf("Telegram chat detection failed: %s", err.Error()),
			IP:        c.IP(),
			UserAgent: c.Get("User-Agent"),
		})
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	activity.Record(activity.Entry{
		Timestamp: time.Now().UTC(),
		Source:    "notification",
		Level:     "info",
		Event:     "telegram_chats_detected",
		Message:   fmt.Sprintf("Detected %d Telegram chat(s)", len(chats)),
		IP:        c.IP(),
		UserAgent: c.Get("User-Agent"),
	})

	return c.JSON(fiber.Map{"items": chats})
}
