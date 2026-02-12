package stream

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
	group := app.Group("/api/streams")
	group.Get("/", h.GetStreams)
	group.Post("/", h.CreateStream)
	group.Post("/:id/start", h.StartStream)
	group.Post("/:id/stop", h.StopStream)
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
	id, _ := c.ParamsInt("id")
	if err := h.svc.StartStream(c.Context(), int64(id)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(200)
}

func (h *Handler) StopStream(c *fiber.Ctx) error {
	id, _ := c.ParamsInt("id")
	if err := h.svc.StopStream(c.Context(), int64(id)); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(200)
}
