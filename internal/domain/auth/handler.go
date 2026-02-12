package auth

import (
	"time"

	"github.com/codewithwan/gostreamix/internal/shared/jwt"
	"github.com/codewithwan/gostreamix/internal/shared/utils"
	"github.com/codewithwan/gostreamix/internal/ui/pages"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	svc   Service
	jwt   *jwt.JWTService
	guard Guard
}

func NewHandler(svc Service, jwt *jwt.JWTService, guard Guard) *Handler {
	return &Handler{svc: svc, jwt: jwt, guard: guard}
}

func (h *Handler) Routes(app *fiber.App) {
	app.Use(h.guard.RequireSetup)
	app.Use(h.guard.RequireAuth)

	app.Get("/setup", h.guard.GuestOnly, h.GetSetup)
	app.Post("/setup", h.PostSetup)
	app.Get("/login", h.guard.GuestOnly, h.GetLogin)
	app.Post("/login", h.PostLogin)
	app.Get("/logout", h.Logout)
}

func getLang(c *fiber.Ctx) string {
	l, _ := c.Locals("lang").(string)
	if l == "" {
		return "en"
	}
	return l
}

func (h *Handler) GetSetup(c *fiber.Ctx) error {
	s, _ := h.svc.IsSetup(c.Context())
	if s {
		return c.Redirect("/login")
	}
	return utils.Render(c, pages.Setup(pages.AuthProps{Lang: getLang(c)}))
}

func (h *Handler) PostSetup(c *fiber.Ctx) error {
	lang := getLang(c)
	u, e, p, cf := c.FormValue("username"), c.FormValue("email"), c.FormValue("password"), c.FormValue("confirm_password")
	if p != cf {
		return utils.Render(c, pages.Setup(pages.AuthProps{Error: "passwords do not match", Lang: lang}))
	}
	if err := h.svc.Setup(c.Context(), u, e, p); err != nil {
		return utils.Render(c, pages.Setup(pages.AuthProps{Error: err.Error(), Lang: lang}))
	}
	return c.Redirect("/login?setup=success")
}

func (h *Handler) GetLogin(c *fiber.Ctx) error {
	return utils.Render(c, pages.Login(pages.AuthProps{Lang: getLang(c)}))
}

func (h *Handler) PostLogin(c *fiber.Ctx) error {
	lang := getLang(c)
	u, p := c.FormValue("username"), c.FormValue("password")
	usr, err := h.svc.Authenticate(c.Context(), u, p)
	if err != nil {
		return utils.Render(c, pages.Login(pages.AuthProps{Error: "invalid credentials", Lang: lang}))
	}
	t, err := h.jwt.GenerateToken(usr.ID)
	if err != nil {
		return c.SendStatus(500)
	}

	c.Cookie(&fiber.Cookie{
		Name:     "jwt",
		Value:    t,
		Expires:  time.Now().Add(time.Hour * 72),
		HTTPOnly: true,
	})

	return c.Redirect("/dashboard?login=success")
}

func (h *Handler) Logout(c *fiber.Ctx) error {
	c.ClearCookie("jwt")
	return c.Redirect("/login")
}
