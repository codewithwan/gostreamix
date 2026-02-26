package auth

import (
	"time"

	"github.com/codewithwan/gostreamix/internal/shared/jwt"
	"github.com/codewithwan/gostreamix/internal/shared/validator"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
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

	api := app.Group("/api/auth")
	api.Get("/session", h.ApiSession)
	api.Post("/setup", h.ApiSetup)
	api.Post("/login", h.ApiLogin)
	api.Post("/logout", h.ApiLogout)
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

func (h *Handler) ApiSetup(c *fiber.Ctx) error {
	var req struct {
		Username        string `json:"username"`
		Email           string `json:"email"`
		Password        string `json:"password"`
		ConfirmPassword string `json:"confirm_password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	req.Username = validator.SanitizeInput(req.Username)
	req.Email = validator.SanitizeInput(req.Email)

	if err := validator.Username(req.Username); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := validator.Email(req.Email); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if req.Password != req.ConfirmPassword {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "passwords do not match"})
	}
	if err := validator.Password(req.Password); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := h.svc.Setup(c.Context(), req.Username, req.Email, req.Password); err != nil {
		h.log.Error("API setup failed", zap.Error(err), zap.String("username", req.Username))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to setup system"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "setup successful"})
}

func (h *Handler) ApiLogin(c *fiber.Ctx) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	req.Username = validator.SanitizeInput(req.Username)

	usr, err := h.svc.Authenticate(c.Context(), req.Username, req.Password)
	if err != nil {
		h.log.Warn("API login failed", zap.String("username", req.Username), zap.String("ip", c.IP()), zap.Error(err))
		errMsg := "invalid credentials"
		if err.Error() == "account locked due to too many failed attempts" {
			errMsg = err.Error()
		}
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": errMsg})
	}

	at, rt, err := h.svc.CreateSession(c.Context(), usr.ID, c.IP(), c.Get("User-Agent"))
	if err != nil {
		h.log.Error("Failed to create API session", zap.Error(err), zap.String("userID", usr.ID.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create session"})
	}

	setSessionCookies(c, at, rt)

	return c.JSON(fiber.Map{
		"token":         at,
		"refresh_token": rt,
		"expires_in":    900,
		"user": fiber.Map{
			"id":       usr.ID,
			"username": usr.Username,
			"email":    usr.Email,
		},
	})
}

func (h *Handler) ApiLogout(c *fiber.Ctx) error {
	rt := c.Cookies("refresh_token")
	if rt != "" {
		_ = h.svc.RevokeSession(c.Context(), rt)
	}

	clearSessionCookies(c)

	return c.JSON(fiber.Map{"message": "logout successful"})
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
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing refresh token"})
	}

	at, newRt, err := h.svc.RefreshSession(c.Context(), rt, c.IP(), c.Get("User-Agent"))
	if err != nil {
		h.log.Error("Refresh failed", zap.Error(err))
		clearSessionCookies(c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid refresh token"})
	}

	setSessionCookies(c, at, newRt)

	return c.JSON(fiber.Map{
		"token":         at,
		"refresh_token": newRt,
		"expires_in":    900,
	})
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
	c.Cookie(&fiber.Cookie{
		Name:     "jwt",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HTTPOnly: true,
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		HTTPOnly: true,
	})
}
