package stream

import "github.com/google/uuid"

type CreateStreamDTO struct {
	VideoID     uuid.UUID `json:"video_id"`
	Name        string    `json:"name" validate:"required,min=3"`
	RTMPTargets []string  `json:"rtmp_targets" validate:"required"`
	Bitrate     int       `json:"bitrate" validate:"required,min=500"`
	Resolution  string    `json:"resolution"`
	FPS         int       `json:"fps"`
	Loop        bool      `json:"loop"`
}

type UpdateStreamDTO struct {
	VideoID     uuid.UUID `json:"video_id"`
	Name        string    `json:"name"`
	RTMPTargets []string  `json:"rtmp_targets"`
	Bitrate     int       `json:"bitrate"`
	Resolution  string    `json:"resolution"`
	FPS         int       `json:"fps"`
	Loop        bool      `json:"loop"`
}

type SaveProgramDTO struct {
	Name         string      `json:"name"`
	VideoIDs     []uuid.UUID `json:"video_ids"`
	RTMPTargets  []string    `json:"rtmp_targets"`
	Bitrate      int         `json:"bitrate"`
	Resolution   string      `json:"resolution"`
	ApplyLiveNow bool        `json:"apply_live_now"`
}
