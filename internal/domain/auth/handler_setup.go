package auth

import (
	"github.com/codewithwan/gostreamix/internal/shared/validator"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

func (h *Handler) ApiSetup(c *fiber.Ctx) error {
	var req struct {
		Username        string `json:"username"`
		Email           string `json:"email"`
		Password        string `json:"password"`
		ConfirmPassword string `json:"confirm_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	req.Username = validator.SanitizeInput(req.Username)
	req.Email = validator.SanitizeInput(req.Email)
	if err := validateSetupRequest(req.Username, req.Email, req.Password, req.ConfirmPassword); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.svc.Setup(c.Context(), req.Username, req.Email, req.Password); err != nil {
		h.log.Error("API setup failed", zap.Error(err), zap.String("username", req.Username))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to setup system"})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "setup successful"})
}

func validateSetupRequest(username, email, password, confirmPassword string) error {
	if err := validator.Username(username); err != nil {
		return err
	}
	if err := validator.Email(email); err != nil {
		return err
	}
	if password != confirmPassword {
		return fiber.NewError(fiber.StatusBadRequest, "passwords do not match")
	}
	return validator.Password(password)
}
