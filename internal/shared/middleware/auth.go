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
	if p == "/setup" || strings.HasPrefix(p, "/assets") {
		return c.Next()
	}
	s, _ := g.svc.IsSetup(c.Context())
	if !s {
		return c.Redirect("/setup")
	}
	return c.Next()
}

func (g *AuthGuard) RequireAuth(c *fiber.Ctx) error {
	p := c.Path()
	if p == "/login" || p == "/setup" || strings.HasPrefix(p, "/assets") || p == "/components/toast/setup_success" {
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
			return c.Redirect("/login")
		}

		at, newRt, err := g.svc.RefreshSession(c.Context(), rt, c.IP(), c.Get("User-Agent"))
		if err != nil {
			c.ClearCookie("jwt", "refresh_token")
			return c.Redirect("/login")
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
