package auth

import (
	"time"

	"github.com/codewithwan/gostreamix/internal/shared/jwt"
	"github.com/codewithwan/gostreamix/internal/shared/utils"
	"github.com/codewithwan/gostreamix/internal/ui/components/toast"
	"github.com/codewithwan/gostreamix/internal/ui/pages"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

type Handler struct {
	svc   Service
	jwt   *jwt.JWTService
	guard Guard
	log   *zap.Logger
}

func NewHandler(svc Service, jwt *jwt.JWTService, guard Guard, log *zap.Logger) *Handler {
	return &Handler{svc: svc, jwt: jwt, guard: guard, log: log}
}

func (h *Handler) Routes(app *fiber.App) {
	app.Use(h.guard.RequireSetup)
	app.Use(h.guard.RequireAuth)

	// API Routes
	api := app.Group("/api/auth")
	api.Post("/setup", h.ApiSetup)
	api.Post("/login", h.ApiLogin)
	api.Post("/logout", h.ApiLogout)
	api.Post("/refresh", h.PostRefresh)

	// UI Routes
	app.Get("/setup", h.guard.GuestOnly, h.GetSetup)
	app.Post("/setup", h.PostSetup)
	app.Get("/login", h.guard.GuestOnly, h.GetLogin)
	app.Post("/login", h.PostLogin)
	app.Get("/logout", h.Logout)

	// UI Components
	app.Get("/components/toast/setup_success", h.GetToastSetupSuccess)
	app.Get("/components/toast/login_success", h.GetToastLoginSuccess)
}

// UI Handlers

func (h *Handler) GetSetup(c *fiber.Ctx) error {
	s, _ := h.svc.IsSetup(c.Context())
	if s {
		return c.Redirect("/login")
	}
	csrfToken, _ := c.Locals("csrf").(string)
	return utils.Render(c, pages.Setup(pages.AuthProps{Lang: utils.GetLang(c), CsrfToken: csrfToken}))
}

func (h *Handler) PostSetup(c *fiber.Ctx) error {
	lang := utils.GetLang(c)
	u, e, p, cf := c.FormValue("username"), c.FormValue("email"), c.FormValue("password"), c.FormValue("confirm_password")
	csrfToken, _ := c.Locals("csrf").(string)
	if p != cf {
		return utils.Render(c, pages.Setup(pages.AuthProps{Error: "passwords do not match", Lang: lang, CsrfToken: csrfToken}))
	}
	if err := h.svc.Setup(c.Context(), u, e, p); err != nil {
		h.log.Error("Setup failed", zap.Error(err), zap.String("username", u))
		return utils.Render(c, pages.Setup(pages.AuthProps{Error: "failed to setup system", Lang: lang, CsrfToken: csrfToken}))
	}
	return c.Redirect("/login?setup=success")
}

func (h *Handler) GetLogin(c *fiber.Ctx) error {
	csrfToken, _ := c.Locals("csrf").(string)
	errMsg := ""
	if c.Query("error") == "expired" {
		errMsg = "Session expired. Please try again."
	}
	return utils.Render(c, pages.Login(pages.AuthProps{
		Error:     errMsg,
		Lang:      utils.GetLang(c),
		CsrfToken: csrfToken,
	}))
}

func (h *Handler) PostLogin(c *fiber.Ctx) error {
	lang := utils.GetLang(c)
	u, p := c.FormValue("username"), c.FormValue("password")
	csrfToken, _ := c.Locals("csrf").(string)
	usr, err := h.svc.Authenticate(c.Context(), u, p)
	if err != nil {
		h.log.Warn("Login failed", zap.String("username", u), zap.String("ip", c.IP()), zap.Error(err))
		return utils.Render(c, pages.Login(pages.AuthProps{Error: "invalid credentials", Lang: lang, CsrfToken: csrfToken}))
	}

	at, rt, err := h.svc.CreateSession(c.Context(), usr.ID, c.IP(), c.Get("User-Agent"))
	if err != nil {
		h.log.Error("Failed to create session", zap.Error(err), zap.String("userID", usr.ID.String()))
		return c.SendStatus(fiber.StatusInternalServerError)
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
		Value:    rt,
		Expires:  time.Now().Add(time.Hour * 24 * 7),
		HTTPOnly: true,
		Secure:   secure,
		SameSite: "Strict",
	})

	return c.Redirect("/dashboard?login=success")
}

func (h *Handler) Logout(c *fiber.Ctx) error {
	rt := c.Cookies("refresh_token")
	if rt != "" {
		_ = h.svc.RevokeSession(c.Context(), rt)
	}
	c.ClearCookie("jwt")
	c.ClearCookie("refresh_token")
	return c.Redirect("/login")
}

func (h *Handler) GetToastSetupSuccess(c *fiber.Ctx) error {
	return utils.Render(c, toast.Toast(toast.Props{
		Title:         "System Setup Successful",
		Description:   "You can now login with your administrator account.",
		Variant:       toast.VariantSuccess,
		ShowIndicator: true,
		Icon:          true,
		Duration:      5000,
		Dismissible:   true,
	}))
}

func (h *Handler) GetToastLoginSuccess(c *fiber.Ctx) error {
	return utils.Render(c, toast.Toast(toast.Props{
		Title:         "Login Successful",
		Description:   "Welcome back to GoStreamix.",
		Variant:       toast.VariantSuccess,
		ShowIndicator: true,
		Icon:          true,
		Duration:      3000,
		Dismissible:   true,
	}))
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
		h.log.Error("API Setup failed", zap.Error(err))
		return c.Status(500).JSON(fiber.Map{"error": "Failed to setup system"})
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
		h.log.Warn("API Login failed", zap.String("username", req.Username), zap.String("ip", c.IP()), zap.Error(err))
		return c.Status(401).JSON(fiber.Map{"error": "invalid credentials"})
	}

	at, rt, err := h.svc.CreateSession(c.Context(), usr.ID, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to create session"})
	}

	return c.JSON(fiber.Map{
		"token":         at,
		"refresh_token": rt,
		"expires_in":    900, // 15 minutes
	})
}

func (h *Handler) ApiLogout(c *fiber.Ctx) error {
	rt := c.Cookies("refresh_token")
	if rt != "" {
		_ = h.svc.RevokeSession(c.Context(), rt)
	}
	c.ClearCookie("jwt")
	c.ClearCookie("refresh_token")
	return c.SendStatus(200)
}

func (h *Handler) PostRefresh(c *fiber.Ctx) error {
	rt := c.Cookies("refresh_token")
	if rt == "" {
		var req struct {
			RefreshToken string `json:"refresh_token"`
		}
		if err := c.BodyParser(&req); err == nil {
			rt = req.RefreshToken
		}
	}

	if rt == "" {
		return c.Status(401).JSON(fiber.Map{"error": "missing refresh token"})
	}

	at, newRt, err := h.svc.RefreshSession(c.Context(), rt, c.IP(), c.Get("User-Agent"))
	if err != nil {
		h.log.Error("Refresh failed", zap.Error(err))
		c.ClearCookie("jwt", "refresh_token")
		return c.Status(401).JSON(fiber.Map{"error": "invalid refresh token"})
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

	return c.JSON(fiber.Map{
		"token":         at,
		"refresh_token": newRt,
		"expires_in":    900,
	})
}
