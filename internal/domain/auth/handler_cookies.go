package auth

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

func setSessionCookies(c *fiber.Ctx, accessToken, refreshToken string) {
	secure := c.Protocol() == "https"
	c.Cookie(&fiber.Cookie{
		Name:     "jwt",
		Value:    accessToken,
		Path:     "/",
		Expires:  time.Now().Add(15 * time.Minute),
		HTTPOnly: true,
		Secure:   secure,
		SameSite: "Strict",
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HTTPOnly: true,
		Secure:   secure,
		SameSite: "Strict",
	})
}

func clearSessionCookies(c *fiber.Ctx) {
	expired := time.Unix(0, 0)
	c.Cookie(&fiber.Cookie{Name: "jwt", Value: "", Path: "/", Expires: expired, HTTPOnly: true})
	c.Cookie(&fiber.Cookie{Name: "refresh_token", Value: "", Path: "/", Expires: expired, HTTPOnly: true})
}
