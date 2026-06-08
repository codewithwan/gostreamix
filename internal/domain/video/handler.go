package video

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

const MaxUploadBytes int64 = 2 * 1024 * 1024 * 1024

var allowedVideoExtensions = map[string]bool{
	".m4v":  true,
	".mkv":  true,
	".mov":  true,
	".mp4":  true,
	".webm": true,
}

var allowedVideoMIMEs = map[string]bool{
	"video/mp4":        true,
	"video/quicktime":  true,
	"video/webm":       true,
	"video/x-m4v":      true,
	"video/x-matroska": true,
}

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
	api.Get("/:id/file", h.ApiGetVideoFile)
	api.Patch("/:id/rename", h.ApiRenameVideo)
	api.Patch("/:id/move", h.ApiMoveVideo)
	api.Post("/:id/copy", h.ApiCopyVideo)
	api.Delete("/:id", h.ApiDeleteVideo)
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
	if file.Size > MaxUploadBytes {
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{
			"error": fmt.Sprintf("video is too large; max upload size is %d MB", MaxUploadBytes/(1024*1024)),
		})
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedVideoExtensions[ext] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unsupported video file extension"})
	}
	contentType := strings.ToLower(strings.TrimSpace(strings.Split(file.Header.Get("Content-Type"), ";")[0]))
	if !allowedVideoMIMEs[contentType] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unsupported video content type"})
	}

	uploadDir := filepath.Join("data", "uploads")
	finalFilename := uuid.New().String() + ext
	finalPath := filepath.Join(uploadDir, finalFilename)
	tempPath := filepath.Join(uploadDir, uuid.New().String()+".upload"+ext)

	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create upload directory"})
	}

	if err := c.SaveFile(file, tempPath); err != nil {
		h.log.Error("Failed to save uploaded file", zap.Error(err))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save file"})
	}
	defer func() { _ = os.Remove(tempPath) }()

	meta, err := ProbeVideo(tempPath)
	if err != nil {
		h.log.Warn("Rejected uploaded file after ffprobe validation", zap.Error(err), zap.String("filename", file.Filename))
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "uploaded file is not a valid video"})
	}
	if maxDuration := maxUploadDurationSeconds(); maxDuration > 0 && meta.Duration > maxDuration {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "video duration exceeds the configured limit"})
	}
	if err := os.Rename(tempPath, finalPath); err != nil {
		h.log.Error("Failed to finalize uploaded file", zap.Error(err))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to save file"})
	}

	v, err := h.svc.ProcessVideo(c.Context(), ProcessVideoDTO{
		Filename:     finalFilename,
		OriginalName: file.Filename,
		Path:         finalPath,
		Folder:       normalizeFolder(c.FormValue("folder")),
		Metadata:     meta,
	})
	if err != nil {
		_ = os.Remove(finalPath)
		h.log.Error("Failed to process video", zap.Error(err), zap.String("filename", finalFilename))
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to process video"})
	}

	return c.Status(fiber.StatusCreated).JSON(v)
}

func (h *Handler) ApiGetVideoFile(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid video id"})
	}

	v, err := h.svc.GetVideo(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "video not found"})
	}

	path, err := safeUploadPath(v.Filename)
	if err != nil {
		h.log.Warn("Rejected unsafe video file path", zap.Error(err), zap.String("videoID", id.String()))
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid video file"})
	}
	if _, err := os.Stat(path); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "video file not found"})
	}

	return c.SendFile(path)
}

func safeUploadPath(filename string) (string, error) {
	uploadDir := filepath.Join("data", "uploads")
	baseAbs, err := filepath.Abs(uploadDir)
	if err != nil {
		return "", err
	}
	targetAbs, err := filepath.Abs(filepath.Join(uploadDir, filename))
	if err != nil {
		return "", err
	}
	if targetAbs != baseAbs && !strings.HasPrefix(targetAbs, baseAbs+string(os.PathSeparator)) {
		return "", fmt.Errorf("path escapes upload directory")
	}
	return targetAbs, nil
}

func maxUploadDurationSeconds() int {
	raw := strings.TrimSpace(os.Getenv("MAX_VIDEO_DURATION_SECONDS"))
	if raw == "" {
		return 0
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 0 {
		return 0
	}
	return value
}

func (h *Handler) ApiRenameVideo(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid video id"})
	}

	var dto RenameVideoDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	v, err := h.svc.RenameVideo(c.Context(), id, dto)
	if err != nil {
		h.log.Error("Failed to rename video", zap.Error(err), zap.String("videoID", id.String()))
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(v)
}

func (h *Handler) ApiMoveVideo(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid video id"})
	}

	var dto MoveVideoDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	v, err := h.svc.MoveVideo(c.Context(), id, dto)
	if err != nil {
		h.log.Error("Failed to move video", zap.Error(err), zap.String("videoID", id.String()))
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(v)
}

func (h *Handler) ApiCopyVideo(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid video id"})
	}

	var dto MoveVideoDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	v, err := h.svc.CopyVideo(c.Context(), id, dto)
	if err != nil {
		h.log.Error("Failed to copy video", zap.Error(err), zap.String("videoID", id.String()))
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
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
