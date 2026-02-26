package middleware

import (
	"strings"
	"time"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/shared/jwt"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type AuthGuard struct {
	svc auth.Service
	jwt *jwt.JWTService
}

func NewAuthGuard(svc auth.Service, jwt *jwt.JWTService) auth.Guard {
	return &AuthGuard{svc: svc, jwt: jwt}
}

func (g *AuthGuard) RequireSetup(c *fiber.Ctx) error {
	p := c.Path()
	if isPublicPath(p) || p == "/setup" || p == "/login" || p == "/api/auth/setup" || p == "/api/auth/login" || p == "/api/auth/session" || p == "/api/auth/refresh" {
		return c.Next()
	}
	s, _ := g.svc.IsSetup(c.Context())
	if !s {
		if strings.HasPrefix(p, "/api/") {
			return c.Status(fiber.StatusPreconditionFailed).JSON(fiber.Map{"error": "system is not setup"})
		}
		return c.Redirect("/setup")
	}
	return c.Next()
}

func (g *AuthGuard) RequireAuth(c *fiber.Ctx) error {
	p := c.Path()
	if isPublicPath(p) || p == "/login" || p == "/setup" || p == "/api/auth/login" || p == "/api/auth/setup" || p == "/api/auth/session" || p == "/api/auth/refresh" {
		return c.Next()
	}

	ck := c.Cookies("jwt")
	valid := false
	if ck != "" {
		id := g.jwt.GetUserID(ck)
		if id != uuid.Nil {
			c.Locals("user_id", id)
			valid = true
		}
	}

	if !valid {
		// Try Refresh
		rt := c.Cookies("refresh_token")
		if rt == "" {
			return unauthorizedResponse(c)
		}

		at, newRt, err := g.svc.RefreshSession(c.Context(), rt, c.IP(), c.Get("User-Agent"))
		if err != nil {
			c.ClearCookie("jwt", "refresh_token")
			return unauthorizedResponse(c)
		}

		secure := c.Protocol() == "https"
		c.Cookie(&fiber.Cookie{
			Name:     "jwt",
			Value:    at,
			Expires:  time.Now().Add(time.Minute * 15),
			HTTPOnly: true,
			Secure:   secure,
			SameSite: "Strict",
		})
		c.Cookie(&fiber.Cookie{
			Name:     "refresh_token",
			Value:    newRt,
			Expires:  time.Now().Add(time.Hour * 24 * 7),
			HTTPOnly: true,
			Secure:   secure,
			SameSite: "Strict",
		})

		id := g.jwt.GetUserID(at)
		c.Locals("user_id", id)
	}

	return c.Next()
}

func unauthorizedResponse(c *fiber.Ctx) error {
	if strings.HasPrefix(c.Path(), "/api/") {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	return c.Redirect("/login")
}

func isPublicPath(path string) bool {
	return strings.HasPrefix(path, "/assets") ||
		strings.HasPrefix(path, "/uploads") ||
		strings.HasPrefix(path, "/thumbnails") ||
		strings.HasPrefix(path, "/web") ||
		strings.HasPrefix(path, "/ws") ||
		path == "/health" ||
		path == "/favicon.ico"
}

func (g *AuthGuard) GuestOnly(c *fiber.Ctx) error {
	isSetup, _ := g.svc.IsSetup(c.Context())
	if !isSetup {
		return c.Next()
	}

	ck := c.Cookies("jwt")
	if ck != "" {
		tk, err := g.jwt.ValidateToken(ck)
		if err == nil && tk != nil && tk.Valid {
			id := g.jwt.GetUserID(ck)
			if id != uuid.Nil {
				return c.Redirect("/dashboard")
			}
		}
	}
	return c.Next()
}

func GetUser(c *fiber.Ctx, svc auth.Service) *auth.User {
	id, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return nil
	}
	u, _ := svc.GetUserByID(c.Context(), id)
	return u
}
