package platform

import (
	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/codewithwan/gostreamix/internal/shared/middleware/i18n"
	"github.com/codewithwan/gostreamix/internal/shared/utils"
	"github.com/codewithwan/gostreamix/internal/ui/components/modals"
	"github.com/codewithwan/gostreamix/internal/ui/components/toast"
	"github.com/codewithwan/gostreamix/internal/ui/pages"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Handler struct {
	svc     Service
	authSvc auth.Service
	log     *zap.Logger
}

func NewHandler(svc Service, authSvc auth.Service, log *zap.Logger) *Handler {
	return &Handler{svc: svc, authSvc: authSvc, log: log}
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
	app.Post("/dashboard/platforms", h.CreatePlatform)
	app.Put("/dashboard/platforms/:id", h.UpdatePlatform)
	app.Delete("/dashboard/platforms/:id", h.DeletePlatform)

	// Components
	app.Get("/components/modals/add-platform", h.GetAddPlatformModal)
	app.Get("/components/modals/edit-platform/:id", h.GetEditPlatformModal)
	app.Get("/components/modals/delete-platform/:id", h.GetDeletePlatformModal)
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
	if len(viewModels) == 0 {
		sb := `<div class="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
			<p class="text-sm font-medium italic">` + i18n.Tr(lang, "platforms.empty") + `</p>
		</div>`
		c.Set("Content-Type", "text/html")
		return c.SendString(sb)
	}

	c.Set("Content-Type", "text/html")
	return utils.Render(c, pages.PlatformsListContent(viewModels, lang))
}

func (h *Handler) GetAddPlatformModal(c *fiber.Ctx) error {
	csrfToken, _ := c.Locals("csrf").(string)
	return utils.Render(c, modals.AddPlatform(utils.GetLang(c), csrfToken))
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

	csrfToken, _ := c.Locals("csrf").(string)
	return utils.Render(c, modals.EditPlatform(utils.GetLang(c), toPlatformView(p), csrfToken))
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

	csrfToken, _ := c.Locals("csrf").(string)
	return utils.Render(c, modals.DeletePlatform(utils.GetLang(c), p.ID, p.Name, csrfToken))
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

	_, err := h.svc.CreatePlatform(c.Context(), u.ID, CreatePlatformDTO{
		Name:         name,
		PlatformType: platformType,
		StreamKey:    streamKey,
		CustomURL:    customURL,
	})
	if err != nil {
		return c.Status(500).SendString("failed to create platform")
	}

	// render toast
	lang := utils.GetLang(c)
	c.Set("Content-Type", "text/html")
	return utils.Render(c, toast.Toast(toast.Props{
		Variant:       toast.VariantSuccess,
		Title:         "Success",
		Description:   i18n.Tr(lang, "platforms.notifications.add_success"),
		ShowIndicator: true,
		Icon:          true,
		Duration:      5000,
		Dismissible:   true,
	}))
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

	_, err = h.svc.UpdatePlatform(c.Context(), id, UpdatePlatformDTO{
		Name:         name,
		PlatformType: platformType,
		StreamKey:    streamKey,
		CustomURL:    customURL,
	})
	if err != nil {
		return c.Status(500).SendString("failed to update platform")
	}

	// render toast
	lang := utils.GetLang(c)
	c.Set("Content-Type", "text/html")
	return utils.Render(c, toast.Toast(toast.Props{
		Variant:       toast.VariantSuccess,
		Title:         "Success",
		Description:   i18n.Tr(lang, "platforms.notifications.update_success"),
		ShowIndicator: true,
		Icon:          true,
		Duration:      5000,
		Dismissible:   true,
	}))
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

	// success toast
	lang := utils.GetLang(c)
	c.Set("Content-Type", "text/html")
	return utils.Render(c, toast.Toast(toast.Props{
		Variant:       toast.VariantSuccess,
		Title:         "Success",
		Description:   i18n.Tr(lang, "platforms.notifications.delete_success"),
		ShowIndicator: true,
		Icon:          true,
		Duration:      5000,
		Dismissible:   true,
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
		h.log.Error("Failed to get platforms", zap.Error(err), zap.String("userID", u.ID.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve platforms",
		})
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
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := req.Validate(); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	p, err := h.svc.CreatePlatform(c.Context(), u.ID, req)
	if err != nil {
		h.log.Error("Failed to create platform", zap.Error(err), zap.String("userID", u.ID.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create platform",
		})
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
		h.log.Error("Failed to delete platform", zap.Error(err), zap.String("platformID", id.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete platform",
		})
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
		return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := req.Validate(); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	p, err := h.svc.UpdatePlatform(c.Context(), id, req)
	if err != nil {
		h.log.Error("Failed to update platform", zap.Error(err), zap.String("platformID", id.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update platform",
		})
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
