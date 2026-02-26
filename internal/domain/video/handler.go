package video

import (
	"os"
	"path/filepath"
	"strings"

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
	Folder    string    `json:"folder"`
	Size      int64     `json:"size"`
	Thumbnail string    `json:"thumbnail"`
	Duration  int       `json:"duration"`
}

func ToVideoView(v *Video) VideoView {
	return VideoView{
		ID:        v.ID,
		Filename:  v.Filename,
		Folder:    v.Folder,
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
		Folder:       normalizeFolder(c.FormValue("folder")),
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

func normalizeFolder(raw string) string {
	folder := strings.TrimSpace(strings.ReplaceAll(raw, "\\", "/"))
	folder = strings.Trim(folder, "/")
	if folder == "" {
		return ""
	}

	parts := strings.Split(folder, "/")
	clean := make([]string, 0, len(parts))
	for _, part := range parts {
		part = sanitizeFolderPart(part)
		if part == "" || part == "." || part == ".." {
			continue
		}
		clean = append(clean, part)
		if len(clean) >= 4 {
			break
		}
	}

	return strings.Join(clean, "/")
}

func sanitizeFolderPart(part string) string {
	part = strings.TrimSpace(part)
	if part == "" {
		return ""
	}

	var builder strings.Builder
	for _, r := range part {
		if (r >= 'a' && r <= 'z') ||
			(r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') ||
			r == '-' ||
			r == '_' ||
			r == ' ' ||
			r == '.' {
			builder.WriteRune(r)
		}
	}

	return strings.TrimSpace(builder.String())
}
