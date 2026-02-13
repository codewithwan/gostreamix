package video

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type Handler struct {
	svc Service
}

func NewHandler(svc Service) *Handler {
	return &Handler{svc: svc}
}

func (h *Handler) Routes(app *fiber.App) {
	group := app.Group("/api/videos")
	group.Get("/", h.GetVideos)
	group.Post("/upload", h.UploadVideo)
	group.Delete("/:id", h.DeleteVideo)
}

func (h *Handler) GetVideos(c *fiber.Ctx) error {
	videos, err := h.svc.GetVideos(c.Context())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(videos)
}

func (h *Handler) UploadVideo(c *fiber.Ctx) error {
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

	v, err := h.svc.ProcessVideo(c.Context(), filename, file.Filename, path)
	if err != nil {
		_ = os.Remove(path)
		return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("failed to process video: %v", err)})
	}

	return c.Status(201).JSON(v)
}

func (h *Handler) DeleteVideo(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid video id"})
	}

	if err := h.svc.DeleteVideo(c.Context(), id); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(204)
}
