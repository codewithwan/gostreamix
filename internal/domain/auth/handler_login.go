package auth

import (
	"github.com/codewithwan/gostreamix/internal/shared/validator"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

func (h *Handler) ApiLogin(c *fiber.Ctx) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	req.Username = validator.SanitizeInput(req.Username)
	usr, err := h.svc.Authenticate(c.Context(), req.Username, req.Password)
	if err != nil {
		h.log.Warn("API login failed", zap.String("username", req.Username), zap.String("ip", c.IP()), zap.Error(err))
		errMsg := "invalid credentials"
		if err.Error() == "account locked due to too many failed attempts" {
			errMsg = err.Error()
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": errMsg})
	}

	at, rt, err := h.svc.CreateSession(c.Context(), usr.ID, c.IP(), c.Get("User-Agent"))
	if err != nil {
		h.log.Error("Failed to create API session", zap.Error(err), zap.String("userID", usr.ID.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create session"})
	}

	setSessionCookies(c, at, rt)
	return c.JSON(sessionResponse(usr, at, rt))
}

func (h *Handler) ApiLogout(c *fiber.Ctx) error {
	if rt := c.Cookies("refresh_token"); rt != "" {
		_ = h.svc.RevokeSession(c.Context(), rt)
	}
	clearSessionCookies(c)
	return c.JSON(fiber.Map{"message": "logout successful"})
}

func sessionResponse(usr *User, accessToken, refreshToken string) fiber.Map {
	return fiber.Map{
		"token":         accessToken,
		"refresh_token": refreshToken,
		"expires_in":    900,
		"user": fiber.Map{
			"id":       usr.ID,
			"username": usr.Username,
			"email":    usr.Email,
		},
	}
}
