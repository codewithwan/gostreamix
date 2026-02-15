package dashboard

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/domain/stream"
	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/codewithwan/gostreamix/internal/shared/middleware/i18n"
	"github.com/codewithwan/gostreamix/internal/shared/utils"
	"github.com/codewithwan/gostreamix/internal/ui/components"
	"github.com/codewithwan/gostreamix/internal/ui/components/modals"
	component_stream "github.com/codewithwan/gostreamix/internal/ui/components/stream"
	component_video "github.com/codewithwan/gostreamix/internal/ui/components/video"
	"github.com/codewithwan/gostreamix/internal/ui/pages"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type Handler struct {
	authSvc   auth.Service
	streamSvc stream.Service
	videoSvc  video.Service
}

func NewHandler(authSvc auth.Service, streamSvc stream.Service, videoSvc video.Service) *Handler {
	return &Handler{authSvc: authSvc, streamSvc: streamSvc, videoSvc: videoSvc}
}

func (h *Handler) Routes(app *fiber.App) {
	app.Get("/dashboard", h.GetDashboard)
	app.Get("/streams", h.GetStreams)
	app.Get("/videos", h.GetVideos)
	app.Get("/settings", h.GetSettings)

	app.Get("/logout/confirm", h.GetLogoutConfirm)
	app.Get("/components/toast/success", h.GetToastSuccess)
	app.Get("/components/toast/setup_success", h.GetToastSetupSuccess)

	app.Get("/components/modals/add-stream", h.GetAddStreamModal)
	app.Post("/dashboard/streams", h.CreateStream)
	app.Get("/dashboard/videos/upload", h.GetUploadVideoModal)
	app.Post("/dashboard/videos/upload", h.UploadVideo)
	app.Get("/components/modals/delete-video/:id", h.GetDeleteVideoModal)
	app.Get("/components/modals/video-preview/:id", h.GetVideoPreviewModal)
	app.Delete("/dashboard/videos/:id", h.DeleteVideo)
}

func (h *Handler) GetAddStreamModal(c *fiber.Ctx) error {
	videos, err := h.videoSvc.GetVideos(c.Context())
	if err != nil {
		videos = []*video.Video{}
	}
	return utils.Render(c, modals.AddStream(h.getLang(c), videos))
}

func (h *Handler) GetUploadVideoModal(c *fiber.Ctx) error {
	return utils.Render(c, modals.UploadVideo(h.getLang(c)))
}

func (h *Handler) GetDeleteVideoModal(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).SendString("invalid id")
	}
	v, err := h.videoSvc.GetVideo(c.Context(), id)
	if err != nil {
		return c.Status(404).SendString("video not found")
	}
	return utils.Render(c, modals.DeleteVideo(h.getLang(c), v.ID, v.Filename))
}

func (h *Handler) GetVideoPreviewModal(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).SendString("invalid id")
	}
	v, err := h.videoSvc.GetVideo(c.Context(), id)
	if err != nil {
		return c.Status(404).SendString("video not found")
	}
	src := "/uploads/" + v.Filename
	var poster string
	if v.Thumbnail != "" {
		poster = "/thumbnails/" + v.Thumbnail
	}
	return utils.Render(c, modals.VideoPreview(h.getLang(c), src, poster, v.Filename))
}

func (h *Handler) DeleteVideo(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).SendString("invalid id")
	}

	if err := h.videoSvc.DeleteVideo(c.Context(), id); err != nil {
		return c.Status(500).SendString("failed to delete video")
	}

	c.Set("Content-Type", "text/html")
	lang := h.getLang(c)
	return utils.Render(c, components.Toast(components.ToastProps{
		Type:    components.ToastTypeSuccess,
		Message: i18n.Tr(lang, "videos.upload_modal.delete_modal.success"),
		Desc:    i18n.Tr(lang, "videos.upload_modal.delete_modal.delete_desc"),
	}))
}

func (h *Handler) CreateStream(c *fiber.Ctx) error {
	name := c.FormValue("name")
	videoID, err := uuid.Parse(c.FormValue("video_id"))
	if err != nil {
		return c.Status(400).SendString("invalid video id")
	}
	bitrate, _ := strconv.Atoi(c.FormValue("bitrate"))
	resolution := c.FormValue("resolution")
	targets := c.FormValue("rtmp_targets")

	var rtmpTargets []string
	if targets != "" {
		lines := strings.Split(targets, "\n")
		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line != "" {
				rtmpTargets = append(rtmpTargets, line)
			}
		}
	}

	dto := stream.CreateStreamDTO{
		Name:        name,
		VideoID:     videoID,
		Bitrate:     bitrate,
		Resolution:  resolution,
		RTMPTargets: rtmpTargets,
		FPS:         30,
		Loop:        true,
	}

	newStream, err := h.streamSvc.CreateStream(c.Context(), dto)
	if err != nil {
		fmt.Println("Error creating stream:", err)
		return c.Status(500).SendString(err.Error())
	}

	var streamSb strings.Builder
	if err := component_stream.Row(newStream, h.getLang(c)).Render(c.Context(), &streamSb); err != nil {
		return c.Status(500).SendString("failed to render stream row")
	}

	var toastSb strings.Builder
	if err := components.Toast(components.ToastProps{
		Type:    components.ToastTypeSuccess,
		Message: i18n.Tr(h.getLang(c), "streams.modal.created_success"),
		Desc:    fmt.Sprintf("Stream '%s' has been created.", newStream.Name),
	}).Render(c.Context(), &toastSb); err != nil {
		fmt.Println("Warning: failed to render toast:", err)
	}

	c.Set("Content-Type", "text/html")
	return c.SendString(streamSb.String() + toastSb.String())
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

		v, err := h.videoSvc.ProcessVideo(c.Context(), filename, file.Filename, path)
		if err != nil {
			_ = os.Remove(path)
			continue
		}

		// Render each card and collect them
		var sb strings.Builder
		if err := component_video.Card(v).Render(c.Context(), &sb); err == nil {
			results = append(results, sb.String())
		}
	}

	if len(results) == 0 {
		return c.Status(500).SendString("failed to process any videos")
	}

	// Add success toast OOB
	var toastSb strings.Builder
	lang := h.getLang(c)
	_ = components.Toast(components.ToastProps{
		Type:    components.ToastTypeSuccess,
		Message: i18n.Tr(lang, "videos.upload_success"),
		Desc:    fmt.Sprintf("%d %s", len(results), i18n.Tr(lang, "videos.upload_success_desc")),
	}).Render(c.Context(), &toastSb)
	results = append(results, toastSb.String())

	c.Set("Content-Type", "text/html")
	return c.SendString(strings.Join(results, ""))
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
	streams, err := h.streamSvc.GetStreams(c.Context())
	if err != nil {
		return utils.Render(c, pages.Streams(u.Username, u.Email, h.getLang(c), []*stream.Stream{}))
	}
	return utils.Render(c, pages.Streams(u.Username, u.Email, h.getLang(c), streams))
}

func (h *Handler) GetVideos(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Redirect("/login")
	}
	videos, err := h.videoSvc.GetVideos(c.Context())
	if err != nil {
		return utils.Render(c, pages.Videos(u.Username, u.Email, h.getLang(c), []*video.Video{}))
	}
	return utils.Render(c, pages.Videos(u.Username, u.Email, h.getLang(c), videos))
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
