package auth

import (
	"github.com/codewithwan/gostreamix/internal/shared/jwt"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// DemoInfo carries public demo-mode settings surfaced to the login page so it
// can offer a one-click auto-fill card. The password here is intentionally a
// shared, read-only demo credential.
type DemoInfo struct {
	Enabled  bool
	Username string
	Password string
}

type Handler struct {
	svc   Service
	jwt   *jwt.JWTService
	guard Guard
	log   *zap.Logger
	demo  DemoInfo
}

func NewHandler(svc Service, jwt *jwt.JWTService, guard Guard, log *zap.Logger, demo DemoInfo) *Handler {
	return &Handler{svc: svc, jwt: jwt, guard: guard, log: log, demo: demo}
}

func (h *Handler) Routes(app *fiber.App) {
	app.Use(h.guard.RequireSetup)
	app.Use(h.guard.RequireAuth)

	api := app.Group("/api/auth")
	api.Get("/session", h.ApiSession)
	api.Post("/setup", h.ApiSetup)
	api.Post("/login", h.ApiLogin)
	api.Post("/logout", h.ApiLogout)
	api.Post("/change-password", h.ApiChangePassword)
	api.Post("/refresh", h.PostRefresh)
}

func (h *Handler) ApiSession(c *fiber.Ctx) error {
	setup, err := h.svc.IsSetup(c.Context())
	if err != nil {
		h.log.Error("Failed to check setup status", zap.Error(err))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to check setup status"})
	}

	csrfToken, _ := c.Locals("csrf").(string)
	res := fiber.Map{
		"setup":         setup,
		"authenticated": false,
		"csrf_token":    csrfToken,
		"demo":          h.demo.Enabled,
	}
	if h.demo.Enabled {
		res["demo_username"] = h.demo.Username
		res["demo_password"] = h.demo.Password
	}

	if !setup {
		return c.JSON(res)
	}

	user := h.userFromAccessToken(c.Cookies("jwt"), c)
	if user == nil {
		rt := c.Cookies("refresh_token")
		if rt != "" {
			at, newRt, refreshErr := h.svc.RefreshSession(c.Context(), rt, c.IP(), c.Get("User-Agent"))
			if refreshErr == nil {
				setSessionCookies(c, at, newRt)
				user = h.userFromAccessToken(at, c)
			} else {
				c.ClearCookie("jwt")
				c.ClearCookie("refresh_token")
			}
		}
	}

	if user == nil {
		return c.JSON(res)
	}

	res["authenticated"] = true
	res["user"] = fiber.Map{
		"id":       user.ID,
		"username": user.Username,
		"email":    user.Email,
	}

	return c.JSON(res)
}

func (h *Handler) userFromAccessToken(accessToken string, c *fiber.Ctx) *User {
	if accessToken == "" {
		return nil
	}

	userID := h.jwt.GetUserID(accessToken)
	if userID == uuid.Nil {
		return nil
	}

	user, err := h.svc.GetUserByID(c.Context(), userID)
	if err != nil {
		return nil
	}

	return user
}
