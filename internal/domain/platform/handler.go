package platform

import (
	"strings"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/codewithwan/gostreamix/internal/shared/middleware/i18n"
	"github.com/codewithwan/gostreamix/internal/shared/utils"
	"github.com/codewithwan/gostreamix/internal/ui/components"
	"github.com/codewithwan/gostreamix/internal/ui/components/modals"
	"github.com/codewithwan/gostreamix/internal/ui/pages"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type Handler struct {
	svc     Service
	authSvc auth.Service
}

func NewHandler(svc Service, authSvc auth.Service) *Handler {
	return &Handler{svc: svc, authSvc: authSvc}
}

func (h *Handler) Routes(app *fiber.App) {
	// API Routes
	api := app.Group("/api/platforms")
	api.Get("/", h.ApiGetPlatforms)
	api.Post("/", h.ApiCreatePlatform)
	api.Delete("/:id", h.ApiDeletePlatform)

	// UI Routes
	app.Get("/platforms", h.GetPlatforms)
	app.Get("/platforms/list", h.GetPlatformsList)
	app.Get("/components/modals/add-platform", h.GetAddPlatformModal)
	app.Get("/components/modals/edit-platform/:id", h.GetEditPlatformModal)
	app.Get("/components/modals/delete-platform/:id", h.GetDeletePlatformModal)
	app.Post("/dashboard/platforms", h.CreatePlatform)
	app.Put("/dashboard/platforms/:id", h.UpdatePlatform)
	app.Delete("/dashboard/platforms/:id", h.DeletePlatform)
}

// UI Handlers

func (h *Handler) GetPlatforms(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Redirect("/login")
	}

	platforms, err := h.svc.GetPlatforms(c.Context(), u.ID)
	if err != nil {
		return utils.Render(c, pages.Platforms(u.Username, u.Email, utils.GetLang(c), []pages.PlatformView{}))
	}

	return utils.Render(c, pages.Platforms(u.Username, u.Email, utils.GetLang(c), toPlatformViews(platforms)))
}

func (h *Handler) GetPlatformsList(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.SendStatus(401)
	}

	platforms, err := h.svc.GetPlatforms(c.Context(), u.ID)
	if err != nil {
		return c.SendStatus(500)
	}

	viewModels := toPlatformViews(platforms)
	lang := utils.GetLang(c)
	var sb string
	if len(viewModels) == 0 {
		sb = `<div class="p-12 text-center text-muted-foreground text-sm italic">` + i18n.Tr(lang, "platforms.empty") + `</div>`
		c.Set("Content-Type", "text/html")
		return c.SendString(sb)
	}

	for _, p := range viewModels {
		if err := pages.PlatformItem(p, lang).Render(c.Context(), c); err != nil {
			return err
		}
	}
	return nil
}

func (h *Handler) GetAddPlatformModal(c *fiber.Ctx) error {
	return utils.Render(c, modals.AddPlatform(utils.GetLang(c)))
}

func (h *Handler) GetEditPlatformModal(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.SendStatus(401)
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).SendString("Invalid ID")
	}

	p, err := h.svc.GetPlatform(c.Context(), id)
	if err != nil {
		return c.Status(404).SendString("Platform not found")
	}

	return utils.Render(c, modals.EditPlatform(utils.GetLang(c), toPlatformView(p)))
}

func (h *Handler) GetDeletePlatformModal(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.SendStatus(401)
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).SendString("Invalid ID")
	}

	p, err := h.svc.GetPlatform(c.Context(), id)
	if err != nil {
		return c.Status(404).SendString("Platform not found")
	}

	return utils.Render(c, modals.DeletePlatform(utils.GetLang(c), p.ID, p.Name))
}

func (h *Handler) CreatePlatform(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(401).SendString("Unauthorized")
	}

	name := c.FormValue("name")
	platformType := c.FormValue("platform_type")
	streamKey := c.FormValue("stream_key")
	customURL := c.FormValue("custom_url")

	p, err := h.svc.CreatePlatform(c.Context(), u.ID, CreatePlatformDTO{
		Name:         name,
		PlatformType: platformType,
		StreamKey:    streamKey,
		CustomURL:    customURL,
	})
	if err != nil {
		return c.Status(500).SendString("failed to create platform")
	}

	// Render success toast OOB first to avoid being nested in table
	lang := utils.GetLang(c)
	var sb strings.Builder
	sb.WriteString(`<div hx-swap-oob="beforeend:body">`)
	_ = components.Toast(components.ToastProps{
		Type:    components.ToastTypeSuccess,
		Message: i18n.Tr(lang, "platforms.notifications.add_success"),
	}).Render(c.Context(), &sb)
	sb.WriteString(`</div>`)

	// Render item
	if err := pages.PlatformItem(toPlatformView(p), lang).Render(c.Context(), &sb); err != nil {
		return err
	}

	c.Set("Content-Type", "text/html")
	return c.SendString(sb.String())
}

func (h *Handler) UpdatePlatform(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(401).SendString("Unauthorized")
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).SendString("Invalid ID")
	}

	name := c.FormValue("name")
	platformType := c.FormValue("platform_type")
	streamKey := c.FormValue("stream_key")
	customURL := c.FormValue("custom_url")

	p, err := h.svc.UpdatePlatform(c.Context(), id, UpdatePlatformDTO{
		Name:         name,
		PlatformType: platformType,
		StreamKey:    streamKey,
		CustomURL:    customURL,
	})
	if err != nil {
		return c.Status(500).SendString("failed to update platform")
	}

	// Render success toast OOB first to avoid being nested in table row
	lang := utils.GetLang(c)
	var sb strings.Builder
	sb.WriteString(`<div hx-swap-oob="beforeend:body">`)
	_ = components.Toast(components.ToastProps{
		Type:    components.ToastTypeSuccess,
		Message: i18n.Tr(lang, "platforms.notifications.update_success"),
	}).Render(c.Context(), &sb)
	sb.WriteString(`</div>`)

	// Render item
	if err := pages.PlatformItem(toPlatformView(p), lang).Render(c.Context(), &sb); err != nil {
		return err
	}

	c.Set("Content-Type", "text/html")
	return c.SendString(sb.String())
}

func (h *Handler) DeletePlatform(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(401).SendString("Unauthorized")
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).SendString("Invalid ID")
	}

	if err := h.svc.DeletePlatform(c.Context(), id); err != nil {
		return c.Status(500).SendString("failed to delete platform")
	}

	// Success toast
	lang := utils.GetLang(c)
	c.Set("Content-Type", "text/html")
	return utils.Render(c, components.Toast(components.ToastProps{
		Type:    components.ToastTypeSuccess,
		Message: i18n.Tr(lang, "platforms.notifications.delete_success"),
	}))
}

// API Handlers

func (h *Handler) ApiGetPlatforms(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	platforms, err := h.svc.GetPlatforms(c.Context(), u.ID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(platforms)
}

func (h *Handler) ApiCreatePlatform(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req CreatePlatformDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	p, err := h.svc.CreatePlatform(c.Context(), u.ID, req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(201).JSON(p)
}

func (h *Handler) ApiDeletePlatform(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	if err := h.svc.DeletePlatform(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.SendStatus(204)
}

func (h *Handler) ApiUpdatePlatform(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(401).JSON(fiber.Map{"error": "Unauthorized"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var req UpdatePlatformDTO
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	p, err := h.svc.UpdatePlatform(c.Context(), id, req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(p)
}

// Helpers

func toPlatformView(p *Platform) pages.PlatformView {
	return pages.PlatformView{
		ID:           p.ID,
		Name:         p.Name,
		PlatformType: p.PlatformType,
		StreamKey:    p.StreamKey,
		CustomURL:    p.CustomURL,
		Enabled:      p.Enabled,
	}
}

func toPlatformViews(platforms []*Platform) []pages.PlatformView {
	views := make([]pages.PlatformView, len(platforms))
	for i, p := range platforms {
		views[i] = toPlatformView(p)
	}
	return views
}
