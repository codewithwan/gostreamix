package video

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

const MaxUploadBytes int64 = 2 * 1024 * 1024 * 1024

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
