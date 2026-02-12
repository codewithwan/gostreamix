package auth

import (
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type Guard struct {
	svc *Service
	jwt *JWTService
}

func NewGuard(svc *Service, jwt *JWTService) *Guard {
	return &Guard{svc: svc, jwt: jwt}
}

func (g *Guard) RequireSetup(c *fiber.Ctx) error {
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

func (g *Guard) RequireAuth(c *fiber.Ctx) error {
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

func (g *Guard) GuestOnly(c *fiber.Ctx) error {
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

func GetUser(c *fiber.Ctx, svc *Service) *User {
	id, ok := c.Locals("user_id").(uuid.UUID)
	if !ok {
		return nil
	}
	u, _ := svc.GetUserByID(c.Context(), id)
	return u
}
