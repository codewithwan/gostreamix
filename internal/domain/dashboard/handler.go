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
	app.Get("/components/modals/upload-video", h.GetUploadVideoModal)
	app.Post("/dashboard/videos/upload", h.UploadVideo)
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

	return utils.Render(c, component_stream.Row(newStream, h.getLang(c)))
}

func (h *Handler) UploadVideo(c *fiber.Ctx) error {
	file, err := c.FormFile("video")
	if err != nil {
		return c.Status(400).SendString("no video file found")
	}

	ext := filepath.Ext(file.Filename)
	filename := uuid.New().String() + ext
	path := filepath.Join("data", "uploads", filename)

	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return c.Status(500).SendString("failed to create upload directory")
	}

	if err := c.SaveFile(file, path); err != nil {
		return c.Status(500).SendString("failed to save file")
	}

	v, err := h.videoSvc.ProcessVideo(c.Context(), filename, file.Filename, path)
	if err != nil {
		_ = os.Remove(path)
		return c.Status(500).SendString(err.Error())
	}

	return utils.Render(c, component_video.Card(v))
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
