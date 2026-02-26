package video

import (
	"os"
	"path/filepath"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
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
	api := app.Group("/api/videos")
	api.Get("/", h.ApiGetVideos)
	api.Post("/upload", h.ApiUploadVideo)
	api.Delete("/:id", h.ApiDeleteVideo)
}

type VideoView struct {
	ID        uuid.UUID `json:"id"`
	Filename  string    `json:"filename"`
	Size      int64     `json:"size"`
	Thumbnail string    `json:"thumbnail"`
	Duration  int       `json:"duration"`
}

func ToVideoView(v *Video) VideoView {
	return VideoView{
		ID:        v.ID,
		Filename:  v.Filename,
		Size:      v.Size,
		Thumbnail: v.Thumbnail,
		Duration:  v.Duration,
	}
}

func ToVideoViews(videos []*Video) []VideoView {
	views := make([]VideoView, len(videos))
	for i, v := range videos {
		views[i] = ToVideoView(v)
	}
	return views
}

func (h *Handler) ApiGetVideos(c *fiber.Ctx) error {
	videos, err := h.svc.GetVideos(c.Context())
	if err != nil {
		h.log.Error("Failed to get videos", zap.Error(err))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to retrieve videos"})
	}
	return c.JSON(videos)
}

func (h *Handler) ApiUploadVideo(c *fiber.Ctx) error {
	file, err := c.FormFile("video")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no video file found"})
	}

	ext := filepath.Ext(file.Filename)
	filename := uuid.New().String() + ext
	path := filepath.Join("data", "uploads", filename)

	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create upload directory"})
	}

	if err := c.SaveFile(file, path); err != nil {
		h.log.Error("Failed to save uploaded file", zap.Error(err))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save file"})
	}

	v, err := h.svc.ProcessVideo(c.Context(), ProcessVideoDTO{
		Filename:     filename,
		OriginalName: file.Filename,
		Path:         path,
	})
	if err != nil {
		_ = os.Remove(path)
		h.log.Error("Failed to process video", zap.Error(err), zap.String("filename", filename))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to process video"})
	}

	return c.Status(fiber.StatusCreated).JSON(v)
}

func (h *Handler) ApiDeleteVideo(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid video id"})
	}

	if err := h.svc.DeleteVideo(c.Context(), id); err != nil {
		h.log.Error("Failed to delete video", zap.Error(err), zap.String("videoID", id.String()))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete video"})
	}

	return c.SendStatus(fiber.StatusNoContent)
}
