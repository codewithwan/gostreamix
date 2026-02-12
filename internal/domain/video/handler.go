package video

import (
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Routes(app *fiber.App) {
	group := app.Group("/api/videos")
	group.Get("/", h.GetVideos)
	group.Delete("/:id", h.DeleteVideo)
}

func (h *Handler) GetVideos(c *fiber.Ctx) error {
	videos, err := h.svc.GetVideos(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(videos)
}

func (h *Handler) DeleteVideo(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	if err := h.svc.DeleteVideo(c.Context(), int64(id)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(200)
}
