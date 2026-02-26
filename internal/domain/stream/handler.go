package stream

import (
	"encoding/json"
	"strings"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type Handler struct {
	svc      Service
	authSvc  auth.Service
	platSvc  platform.Service
	videoSvc video.Service
	log      *zap.Logger
}

func NewHandler(svc Service, authSvc auth.Service, platSvc platform.Service, videoSvc video.Service, log *zap.Logger) *Handler {
	return &Handler{svc: svc, authSvc: authSvc, platSvc: platSvc, videoSvc: videoSvc, log: log}
}

func (h *Handler) Routes(app *fiber.App) {
	api := app.Group("/api/streams")
	api.Get("/", h.ApiGetStreams)
	api.Post("/", h.ApiCreateStream)
	api.Post("/:id/reload", h.ApiReloadStream)
	api.Get("/:id/workspace", h.ApiGetWorkspace)
	api.Post("/:id/program/apply", h.ApiApplyProgram)
	api.Post("/:id/start", h.ApiStartStream)
	api.Post("/:id/stop", h.ApiStopStream)
	api.Get("/:id/stats", h.ApiGetStreamStats)
	api.Delete("/:id", h.ApiDeleteStream)
}

func (h *Handler) ApiGetStreamStats(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid stream id"})
	}

	stats, err := h.svc.GetStreamStats(c.Context(), id)
	if err != nil {
		h.log.Error("Failed to get stream stats", zap.Error(err), zap.String("streamID", id.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to get stream stats"})
	}

	return c.JSON(stats)
}

func (h *Handler) ApiDeleteStream(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid stream id"})
	}

	if err := h.svc.DeleteStream(c.Context(), id); err != nil {
		h.log.Error("Failed to delete stream", zap.Error(err), zap.String("streamID", id.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete stream"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

func (h *Handler) ApiGetStreams(c *fiber.Ctx) error {
	streams, err := h.svc.GetStreams(c.Context())
	if err != nil {
		h.log.Error("Failed to list streams", zap.Error(err))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list streams"})
	}

	return c.JSON(streams)
}

func (h *Handler) ApiCreateStream(c *fiber.Ctx) error {
	var dto CreateStreamDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	streamData, err := h.svc.CreateStream(c.Context(), dto)
	if err != nil {
		h.log.Error("Failed to create stream", zap.Error(err))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(streamData)
}

func (h *Handler) ApiReloadStream(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid stream id"})
	}

	var dto UpdateStreamDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if _, err := h.svc.UpdateStream(c.Context(), id, dto); err != nil {
		h.log.Error("Failed to reload stream", zap.Error(err), zap.String("streamID", id.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to reload stream"})
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *Handler) ApiGetWorkspace(c *fiber.Ctx) error {
	u := middleware.GetUser(c, h.authSvc)
	if u == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid stream id"})
	}

	streamData, err := h.svc.GetStream(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "stream not found"})
	}

	program, err := h.svc.GetProgram(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load program"})
	}

	videos, _ := h.videoSvc.GetVideos(c.Context())
	plats, _ := h.platSvc.GetPlatforms(c.Context(), u.ID)

	return c.JSON(fiber.Map{
		"stream":    streamData,
		"program":   program,
		"videos":    video.ToVideoViews(videos),
		"platforms": toPlatformOptions(plats),
	})
}

func (h *Handler) ApiApplyProgram(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid stream id"})
	}

	var payload struct {
		Name        string   `json:"name"`
		VideoIDs    []string `json:"video_ids"`
		RTMPTargets []string `json:"rtmp_targets"`
		Bitrate     int      `json:"bitrate"`
		Resolution  string   `json:"resolution"`
		ApplyLive   bool     `json:"apply_live_now"`
	}

	if err := json.Unmarshal(c.Body(), &payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid payload"})
	}

	videoIDs := make([]uuid.UUID, 0, len(payload.VideoIDs))
	for _, rawID := range payload.VideoIDs {
		parsed, err := uuid.Parse(rawID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid video id in queue"})
		}
		videoIDs = append(videoIDs, parsed)
	}

	dto := SaveProgramDTO{
		Name:         payload.Name,
		VideoIDs:     videoIDs,
		RTMPTargets:  payload.RTMPTargets,
		Bitrate:      payload.Bitrate,
		Resolution:   payload.Resolution,
		ApplyLiveNow: payload.ApplyLive,
	}

	program, err := h.svc.SaveProgram(c.Context(), id, dto)
	if err != nil {
		h.log.Error("Failed to apply stream program", zap.Error(err), zap.String("streamID", id.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save and apply program"})
	}

	return c.JSON(program)
}

func (h *Handler) ApiStartStream(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid stream id"})
	}

	if err := h.svc.StartStream(c.Context(), id); err != nil {
		h.log.Error("Failed to start stream", zap.Error(err), zap.String("streamID", id.String()))
		if strings.Contains(err.Error(), ErrStreamProgramEmpty.Error()) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "project has no video queue"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to start stream"})
	}

	return c.SendStatus(fiber.StatusOK)
}

func (h *Handler) ApiStopStream(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid stream id"})
	}

	if err := h.svc.StopStream(c.Context(), id); err != nil {
		h.log.Error("Failed to stop stream", zap.Error(err), zap.String("streamID", id.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to stop stream"})
	}

	return c.SendStatus(fiber.StatusOK)
}

type platformOption struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	RTMPURL   string    `json:"rtmp_url"`
	Enabled   bool      `json:"enabled"`
	StreamKey string    `json:"stream_key"`
}

func toPlatformOptions(plats []*platform.Platform) []platformOption {
	options := make([]platformOption, 0, len(plats))
	for _, p := range plats {
		if p == nil {
			continue
		}

		options = append(options, platformOption{
			ID:        p.ID,
			Name:      p.Name,
			Type:      p.PlatformType,
			RTMPURL:   buildRTMPTarget(p.PlatformType, p.CustomURL, p.StreamKey),
			Enabled:   p.Enabled,
			StreamKey: p.StreamKey,
		})
	}

	return options
}

func buildRTMPTarget(platformType, baseURL, streamKey string) string {
	platformType = strings.ToLower(strings.TrimSpace(platformType))
	baseURL = strings.TrimSpace(baseURL)
	streamKey = strings.TrimSpace(streamKey)

	if baseURL == "" {
		switch platformType {
		case "youtube":
			baseURL = "rtmp://a.rtmp.youtube.com/live2"
		case "twitch":
			baseURL = "rtmp://live.twitch.tv/app"
		case "facebook":
			baseURL = "rtmps://live-api-s.facebook.com:443/rtmp"
		}
	}

	if baseURL == "" {
		return ""
	}

	if streamKey == "" {
		return baseURL
	}
	if strings.HasSuffix(baseURL, "/") {
		return baseURL + streamKey
	}
	return baseURL + "/" + streamKey
}
