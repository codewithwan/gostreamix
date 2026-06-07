package stream

import (
	"encoding/json"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

func (h *Handler) ApiApplyProgram(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid stream id"})
	}

	payload, err := parseApplyProgramPayload(c.Body())
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	program, err := h.svc.SaveProgram(c.Context(), id, payload)
	if err != nil {
		h.log.Error("Failed to apply stream program", zap.Error(err), zap.String("streamID", id.String()))
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(program)
}

func parseApplyProgramPayload(body []byte) (SaveProgramDTO, error) {
	var payload struct {
		Name        string   `json:"name"`
		VideoIDs    []string `json:"video_ids"`
		RTMPTargets []string `json:"rtmp_targets"`
		Bitrate     int      `json:"bitrate"`
		Resolution  string   `json:"resolution"`
		FPS         int      `json:"fps"`
		ApplyLive   bool     `json:"apply_live_now"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return SaveProgramDTO{}, err
	}

	videoIDs := make([]uuid.UUID, 0, len(payload.VideoIDs))
	for _, rawID := range payload.VideoIDs {
		parsed, err := uuid.Parse(rawID)
		if err != nil {
			return SaveProgramDTO{}, fiber.NewError(fiber.StatusBadRequest, "invalid video id in queue")
		}
		videoIDs = append(videoIDs, parsed)
	}

	return SaveProgramDTO{
		Name:         payload.Name,
		VideoIDs:     videoIDs,
		RTMPTargets:  payload.RTMPTargets,
		Bitrate:      payload.Bitrate,
		Resolution:   payload.Resolution,
		FPS:          payload.FPS,
		ApplyLiveNow: payload.ApplyLive,
	}, nil
}
