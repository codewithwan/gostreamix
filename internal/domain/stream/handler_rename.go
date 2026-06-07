package stream

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

func (h *Handler) ApiRenameStream(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid stream id"})
	}

	var dto RenameStreamDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	streamData, err := h.svc.RenameStream(c.Context(), id, dto)
	if err != nil {
		h.log.Error("Failed to rename stream", zap.Error(err), zap.String("streamID", id.String()))
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(streamData)
}
