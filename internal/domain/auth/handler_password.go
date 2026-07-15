package auth

import (
	"errors"

	"github.com/codewithwan/gostreamix/internal/shared/validator"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// ApiChangePassword lets the authenticated operator rotate their own password.
// The current user is resolved from the auth middleware (user_id local), so the
// endpoint never trusts a user id from the request body.
func (h *Handler) ApiChangePassword(c *fiber.Ctx) error {
	var req struct {
		CurrentPassword string `json:"current_password"`
		NewPassword     string `json:"new_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	userID, ok := c.Locals("user_id").(uuid.UUID)
	if !ok || userID == uuid.Nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	if err := validator.Password(req.NewPassword); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if req.CurrentPassword == req.NewPassword {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "new password must be different from current password"})
	}

	if err := h.svc.ChangePassword(c.Context(), userID, req.CurrentPassword, req.NewPassword); err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "current password is incorrect"})
		}
		h.log.Error("Failed to change password", zap.Error(err), zap.String("userID", userID.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to change password"})
	}

	return c.JSON(fiber.Map{"message": "password changed"})
}
