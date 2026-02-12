package stream

type CreateStreamDTO struct {
	Name        string   `json:"name" validate:"required,min=3"`
	RTMPTargets []string `json:"rtmp_targets" validate:"required"`
	Bitrate     int      `json:"bitrate" validate:"required,min=500"`
	Resolution  string   `json:"resolution"`
	FPS         int      `json:"fps"`
	Loop        bool     `json:"loop"`
}

type UpdateStreamDTO struct {
	Name        string   `json:"name"`
	RTMPTargets []string `json:"rtmp_targets"`
	Bitrate     int      `json:"bitrate"`
	Resolution  string   `json:"resolution"`
	FPS         int      `json:"fps"`
	Loop        bool     `json:"loop"`
}
