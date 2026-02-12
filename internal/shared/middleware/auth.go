package middleware

import (
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
	if p == "/setup" || (len(p) > 7 && p[:7] == "/assets") {
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
	if p == "/login" || p == "/setup" || (len(p) > 7 && p[:7] == "/assets") {
		return c.Next()
	}
	ck := c.Cookies("jwt")
	if ck == "" {
		return c.Redirect("/login")
	}
	tk, err := g.jwt.ValidateToken(ck)
	if err != nil || tk == nil || !tk.Valid {
		return c.Redirect("/login")
	}
	id := g.jwt.GetUserID(ck)
	if id == uuid.Nil {
		return c.Redirect("/login")
	}
	c.Locals("user_id", id)
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
