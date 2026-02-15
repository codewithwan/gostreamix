package stream

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/codewithwan/gostreamix/internal/shared/middleware/i18n"
	"github.com/codewithwan/gostreamix/internal/shared/utils"
	"github.com/codewithwan/gostreamix/internal/ui/components"
	"github.com/codewithwan/gostreamix/internal/ui/components/modals"
	component_stream "github.com/codewithwan/gostreamix/internal/ui/components/stream"
	"github.com/codewithwan/gostreamix/internal/ui/pages"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type Handler struct {
	svc      Service
	authSvc  auth.Service
	videoSvc video.Service
}

func NewHandler(svc Service, authSvc auth.Service, videoSvc video.Service) *Handler {
	return &Handler{svc: svc, authSvc: authSvc, videoSvc: videoSvc}
}

func (h *Handler) Routes(app *fiber.App) {
	// API Routes
	api := app.Group("/api/streams")
	api.Get("/", h.ApiGetStreams)
	api.Post("/", h.ApiCreateStream)
	api.Post("/:id/start", h.ApiStartStream)
	api.Post("/:id/stop", h.ApiStopStream)
	api.Get("/:id/stats", h.ApiGetStreamStats)
	api.Delete("/:id", h.ApiDeleteStream)

	// UI Routes
	app.Get("/streams", h.GetStreams)
	app.Get("/components/modals/add-stream", h.GetAddStreamModal)
	app.Post("/dashboard/streams", h.CreateStream)
}

// UI Handlers

func (h *Handler) GetStreams(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Redirect("/login")
	}
	streams, err := h.svc.GetStreams(c.Context())
	if err != nil {
		return utils.Render(c, pages.Streams(u.Username, u.Email, utils.GetLang(c), []component_stream.StreamView{}))
	}
	return utils.Render(c, pages.Streams(u.Username, u.Email, utils.GetLang(c), toStreamViews(streams)))
}

func toStreamView(s *Stream) component_stream.StreamView {
	return component_stream.StreamView{
		ID:          s.ID,
		Name:        s.Name,
		RTMPTargets: s.RTMPTargets,
		Bitrate:     s.Bitrate,
		Resolution:  s.Resolution,
		Status:      s.Status,
	}
}

func toStreamViews(streams []*Stream) []component_stream.StreamView {
	views := make([]component_stream.StreamView, len(streams))
	for i, s := range streams {
		views[i] = toStreamView(s)
	}
	return views
}

func (h *Handler) GetAddStreamModal(c *fiber.Ctx) error {
	videos, err := h.videoSvc.GetVideos(c.Context())
	if err != nil {
		videos = []*video.Video{}
	}
	return utils.Render(c, modals.AddStream(utils.GetLang(c), video.ToVideoViews(videos)))
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

	dto := CreateStreamDTO{
		Name:        name,
		VideoID:     videoID,
		Bitrate:     bitrate,
		Resolution:  resolution,
		RTMPTargets: rtmpTargets,
		FPS:         30,
		Loop:        true,
	}

	newStream, err := h.svc.CreateStream(c.Context(), dto)
	if err != nil {
		fmt.Println("Error creating stream:", err)
		return c.Status(500).SendString(err.Error())
	}

	var streamSb strings.Builder
	if err := component_stream.Row(toStreamView(newStream), utils.GetLang(c)).Render(c.Context(), &streamSb); err != nil {
		return c.Status(500).SendString("failed to render stream row")
	}

	var toastSb strings.Builder
	if err := components.Toast(components.ToastProps{
		Type:    components.ToastTypeSuccess,
		Message: i18n.Tr(utils.GetLang(c), "streams.modal.created_success"),
		Desc:    fmt.Sprintf("Stream '%s' has been created.", newStream.Name),
	}).Render(c.Context(), &toastSb); err != nil {
		fmt.Println("Warning: failed to render toast:", err)
	}

	c.Set("Content-Type", "text/html")
	return c.SendString(streamSb.String() + toastSb.String())
}

// API Handlers

func (h *Handler) ApiGetStreamStats(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid stream id"})
	}
	stats, err := h.svc.GetStreamStats(c.Context(), id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(stats)
}

func (h *Handler) ApiDeleteStream(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid stream id"})
	}
	if err := h.svc.DeleteStream(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(204)
}

func (h *Handler) ApiGetStreams(c *fiber.Ctx) error {
	streams, err := h.svc.GetStreams(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(streams)
}

func (h *Handler) ApiCreateStream(c *fiber.Ctx) error {
	var dto CreateStreamDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}
	stream, err := h.svc.CreateStream(c.Context(), dto)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(201).JSON(stream)
}

func (h *Handler) ApiStartStream(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid stream id"})
	}
	if err := h.svc.StartStream(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(200)
}

func (h *Handler) ApiStopStream(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid stream id"})
	}
	if err := h.svc.StopStream(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(200)
}
