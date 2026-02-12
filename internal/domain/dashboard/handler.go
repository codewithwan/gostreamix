package dashboard

import (
	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/codewithwan/gostreamix/internal/shared/utils"
	"github.com/codewithwan/gostreamix/internal/ui/components"
	"github.com/codewithwan/gostreamix/internal/ui/pages"
	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	authSvc auth.Service
}

func NewHandler(authSvc auth.Service) *Handler {
	return &Handler{authSvc: authSvc}
}

func (h *Handler) Routes(app *fiber.App) {
	app.Get("/dashboard", h.GetDashboard)
	app.Get("/streams", h.GetStreams)
	app.Get("/videos", h.GetVideos)
	app.Get("/settings", h.GetSettings)

	app.Get("/logout/confirm", h.GetLogoutConfirm)
	app.Get("/components/toast/success", h.GetToastSuccess)
	app.Get("/components/toast/setup_success", h.GetToastSetupSuccess)
}

func (h *Handler) getLang(c *fiber.Ctx) string {
	lang, _ := c.Locals("lang").(string)
	if lang == "" {
		lang = "en"
	}
	return lang
}

func (h *Handler) GetDashboard(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Redirect("/login")
	}
	return utils.Render(c, pages.Dashboard(u.Username, u.Email, h.getLang(c)))
}

func (h *Handler) GetStreams(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Redirect("/login")
	}
	return utils.Render(c, pages.Streams(u.Username, u.Email, h.getLang(c)))
}

func (h *Handler) GetVideos(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Redirect("/login")
	}
	return utils.Render(c, pages.Videos(u.Username, u.Email, h.getLang(c)))
}

func (h *Handler) GetSettings(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Redirect("/login")
	}
	return utils.Render(c, pages.Settings(u.Username, u.Email, h.getLang(c)))
}

func (h *Handler) GetLogoutConfirm(c *fiber.Ctx) error {
	return utils.Render(c, components.LogoutConfirm(h.getLang(c)))
}
