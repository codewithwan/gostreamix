package auth

import (
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

func (h *Handler) PostRefresh(c *fiber.Ctx) error {
	rt := refreshTokenFromRequest(c)
	if rt == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing refresh token"})
	}

	at, newRt, err := h.svc.RefreshSession(c.Context(), rt, c.IP(), c.Get("User-Agent"))
	if err != nil {
		h.log.Error("Refresh failed", zap.Error(err))
		clearSessionCookies(c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid refresh token"})
	}

	setSessionCookies(c, at, newRt)
	return c.JSON(fiber.Map{"token": at, "refresh_token": newRt, "expires_in": 900})
}

func refreshTokenFromRequest(c *fiber.Ctx) string {
	if rt := c.Cookies("refresh_token"); rt != "" {
		return rt
	}
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := c.BodyParser(&req); err == nil {
		return req.RefreshToken
	}
	return ""
}
