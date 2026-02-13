package stream

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Routes(app *fiber.App) {
	group := app.Group("/api/streams")
	group.Get("/", h.GetStreams)
	group.Post("/", h.CreateStream)
	group.Post("/:id/start", h.StartStream)
	group.Post("/:id/stop", h.StopStream)
	group.Get("/:id/stats", h.GetStreamStats)
	group.Delete("/:id", h.DeleteStream)
}

func (h *Handler) GetStreamStats(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid stream id"})
	}
	stats, err := h.svc.GetStreamStats(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stats)
}

func (h *Handler) DeleteStream(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid stream id"})
	}
	if err := h.svc.DeleteStream(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(204)
}

func (h *Handler) GetStreams(c *fiber.Ctx) error {
	streams, err := h.svc.GetStreams(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(streams)
}

func (h *Handler) CreateStream(c *fiber.Ctx) error {
	var dto CreateStreamDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	stream, err := h.svc.CreateStream(c.Context(), dto)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(stream)
}

func (h *Handler) StartStream(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid stream id"})
	}
	if err := h.svc.StartStream(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(200)
}

func (h *Handler) StopStream(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid stream id"})
	}
	if err := h.svc.StopStream(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(200)
}
