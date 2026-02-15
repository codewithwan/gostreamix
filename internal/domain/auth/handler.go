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

	// API Routes
	api := app.Group("/api/auth")
	api.Post("/setup", h.ApiSetup)
	api.Post("/login", h.ApiLogin)
	api.Post("/logout", h.ApiLogout)

	// UI Routes
	app.Get("/setup", h.guard.GuestOnly, h.GetSetup)
	app.Post("/setup", h.PostSetup)
	app.Get("/login", h.guard.GuestOnly, h.GetLogin)
	app.Post("/login", h.PostLogin)
	app.Get("/logout", h.Logout)
}

// UI Handlers

func (h *Handler) GetSetup(c *fiber.Ctx) error {
	s, _ := h.svc.IsSetup(c.Context())
	if s {
		return c.Redirect("/login")
	}
	return utils.Render(c, pages.Setup(pages.AuthProps{Lang: utils.GetLang(c)}))
}

func (h *Handler) PostSetup(c *fiber.Ctx) error {
	lang := utils.GetLang(c)
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
	return utils.Render(c, pages.Login(pages.AuthProps{Lang: utils.GetLang(c)}))
}

func (h *Handler) PostLogin(c *fiber.Ctx) error {
	lang := utils.GetLang(c)
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

// API Handlers

func (h *Handler) ApiSetup(c *fiber.Ctx) error {
	var req struct {
		Username        string `json:"username"`
		Email           string `json:"email"`
		Password        string `json:"password"`
		ConfirmPassword string `json:"confirm_password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	if req.Password != req.ConfirmPassword {
		return c.Status(400).JSON(fiber.Map{"error": "passwords do not match"})
	}

	if err := h.svc.Setup(c.Context(), req.Username, req.Email, req.Password); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(fiber.Map{"message": "setup successful"})
}

func (h *Handler) ApiLogin(c *fiber.Ctx) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	usr, err := h.svc.Authenticate(c.Context(), req.Username, req.Password)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "invalid credentials"})
	}

	t, err := h.jwt.GenerateToken(usr.ID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to generate token"})
	}

	// Also set cookie for API clients that might use browser-like behavior?
	// Or just return token. Usually API returns token.
	return c.JSON(fiber.Map{"token": t})
}

func (h *Handler) ApiLogout(c *fiber.Ctx) error {
	// For JWT stateless auth, logout is client-side (clearing token).
	// But if using cookies, we clear them.
	c.ClearCookie("jwt")
	return c.SendStatus(200)
}
