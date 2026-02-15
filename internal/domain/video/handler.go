package video

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/codewithwan/gostreamix/internal/shared/middleware/i18n"
	"github.com/codewithwan/gostreamix/internal/shared/utils"
	"github.com/codewithwan/gostreamix/internal/ui/components"
	"github.com/codewithwan/gostreamix/internal/ui/components/modals"
	component_video "github.com/codewithwan/gostreamix/internal/ui/components/video"
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
	api := app.Group("/api/videos")
	api.Get("/", h.ApiGetVideos)
	api.Post("/upload", h.ApiUploadVideo)
	api.Delete("/:id", h.ApiDeleteVideo)

	// UI Routes
	app.Get("/videos", h.GetVideos)
	app.Get("/dashboard/videos/upload", h.GetUploadVideoModal)
	app.Post("/dashboard/videos/upload", h.UploadVideo)
	app.Get("/components/modals/delete-video/:id", h.GetDeleteVideoModal)
	app.Get("/components/modals/video-preview/:id", h.GetVideoPreviewModal)
	app.Delete("/dashboard/videos/:id", h.DeleteVideo)
}

// UI Handlers

func (h *Handler) GetVideos(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Redirect("/login")
	}
	videos, err := h.svc.GetVideos(c.Context())
	if err != nil {
		return utils.Render(c, pages.Videos(u.Username, u.Email, utils.GetLang(c), []component_video.VideoView{}))
	}
	return utils.Render(c, pages.Videos(u.Username, u.Email, utils.GetLang(c), ToVideoViews(videos)))
}

func ToVideoView(v *Video) component_video.VideoView {
	return component_video.VideoView{
		ID:        v.ID,
		Filename:  v.Filename,
		Size:      v.Size,
		Thumbnail: v.Thumbnail,
		Duration:  v.Duration,
	}
}

func ToVideoViews(videos []*Video) []component_video.VideoView {
	views := make([]component_video.VideoView, len(videos))
	for i, v := range videos {
		views[i] = ToVideoView(v)
	}
	return views
}

func (h *Handler) GetUploadVideoModal(c *fiber.Ctx) error {
	return utils.Render(c, modals.UploadVideo(utils.GetLang(c)))
}

func (h *Handler) UploadVideo(c *fiber.Ctx) error {
	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(400).SendString("invalid form data")
	}

	files := form.File["video"]
	if len(files) == 0 {
		return c.Status(400).SendString("no video files found")
	}

	var results []string
	for _, file := range files {
		ext := filepath.Ext(file.Filename)
		filename := uuid.New().String() + ext
		path := filepath.Join("data", "uploads", filename)

		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			continue
		}

		if err := c.SaveFile(file, path); err != nil {
			continue
		}

		v, err := h.svc.ProcessVideo(c.Context(), ProcessVideoDTO{
			Filename:     filename,
			OriginalName: file.Filename,
			Path:         path,
		})
		if err != nil {
			_ = os.Remove(path)
			continue
		}

		// video card
		var sb strings.Builder
		if err := component_video.Card(ToVideoView(v)).Render(c.Context(), &sb); err == nil {
			results = append(results, sb.String())
		}
	}

	if len(results) == 0 {
		return c.Status(500).SendString("failed to process any videos")
	}

	// success toast
	var toastSb strings.Builder
	lang := utils.GetLang(c)
	_ = components.Toast(components.ToastProps{
		Type:    components.ToastTypeSuccess,
		Message: i18n.Tr(lang, "videos.notifications.upload_success"),
		Desc:    fmt.Sprintf("%d %s", len(results), i18n.Tr(lang, "videos.notifications.upload_desc")),
	}).Render(c.Context(), &toastSb)
	results = append(results, toastSb.String())

	c.Set("Content-Type", "text/html")
	return c.SendString(strings.Join(results, ""))
}

func (h *Handler) GetDeleteVideoModal(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).SendString("invalid id")
	}
	v, err := h.svc.GetVideo(c.Context(), id)
	if err != nil {
		return c.Status(404).SendString("video not found")
	}
	return utils.Render(c, modals.DeleteVideo(utils.GetLang(c), v.ID, v.Filename))
}

func (h *Handler) GetVideoPreviewModal(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).SendString("invalid id")
	}
	v, err := h.svc.GetVideo(c.Context(), id)
	if err != nil {
		return c.Status(404).SendString("video not found")
	}
	src := "/uploads/" + v.Filename
	var poster string
	if v.Thumbnail != "" {
		poster = "/thumbnails/" + v.Thumbnail
	}
	return utils.Render(c, modals.VideoPreview(utils.GetLang(c), src, poster, v.Filename))
}

func (h *Handler) DeleteVideo(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).SendString("invalid id")
	}

	if err := h.svc.DeleteVideo(c.Context(), id); err != nil {
		return c.Status(500).SendString("failed to delete video")
	}

	c.Set("Content-Type", "text/html")
	lang := utils.GetLang(c)
	return utils.Render(c, components.Toast(components.ToastProps{
		Type:    components.ToastTypeSuccess,
		Message: i18n.Tr(lang, "videos.notifications.delete_success"),
		Desc:    i18n.Tr(lang, "videos.notifications.delete_desc"),
	}))
}

// API Handlers

func (h *Handler) ApiGetVideos(c *fiber.Ctx) error {
	videos, err := h.svc.GetVideos(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(videos)
}

func (h *Handler) ApiUploadVideo(c *fiber.Ctx) error {
	file, err := c.FormFile("video")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "no video file found"})
	}

	ext := filepath.Ext(file.Filename)
	filename := uuid.New().String() + ext
	path := filepath.Join("data", "uploads", filename)

	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to create upload directory"})
	}

	if err := c.SaveFile(file, path); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to save file"})
	}

	v, err := h.svc.ProcessVideo(c.Context(), ProcessVideoDTO{
		Filename:     filename,
		OriginalName: file.Filename,
		Path:         path,
	})
	if err != nil {
		_ = os.Remove(path)
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("failed to process video: %v", err)})
	}

	return c.Status(201).JSON(v)
}

func (h *Handler) ApiDeleteVideo(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid video id"})
	}

	if err := h.svc.DeleteVideo(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(204)
}
