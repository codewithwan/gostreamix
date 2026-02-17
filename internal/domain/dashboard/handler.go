package dashboard

import (
	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/codewithwan/gostreamix/internal/shared/utils"
	"github.com/codewithwan/gostreamix/internal/ui/components"
	"github.com/codewithwan/gostreamix/internal/ui/pages"
	"github.com/gofiber/fiber/v2"
	"go.uber.org/zap"
)

type Handler struct {
	authSvc auth.Service
	log     *zap.Logger
}

func NewHandler(authSvc auth.Service, log *zap.Logger) *Handler {
	return &Handler{authSvc: authSvc, log: log}
}

func (h *Handler) Routes(app *fiber.App) {
	app.Get("/dashboard", h.GetDashboard)
	app.Get("/settings", h.GetSettings)

	app.Get("/logout/confirm", h.GetLogoutConfirm)
	app.Get("/components/toast/success", h.GetToastSuccess)
}

func (h *Handler) GetDashboard(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Redirect("/login")
	}
	return utils.Render(c, pages.Dashboard(u.Username, u.Email, utils.GetLang(c)))
}

func (h *Handler) GetSettings(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Redirect("/login")
	}
	return utils.Render(c, pages.Settings(u.Username, u.Email, utils.GetLang(c)))
}

func (h *Handler) GetLogoutConfirm(c *fiber.Ctx) error {
	return utils.Render(c, components.LogoutConfirm(utils.GetLang(c)))
}

func (h *Handler) GetToastSuccess(c *fiber.Ctx) error {
	return utils.Render(c, components.Toast(components.ToastProps{
		Type:    components.ToastTypeSuccess,
		Message: "Success",
	}))
}
