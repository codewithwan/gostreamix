package stream

import (
	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/google/uuid"
)

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
			RTMPURL:   platform.BuildRTMPTarget(p.PlatformType, p.CustomURL, p.StreamKey),
			Enabled:   p.Enabled,
			StreamKey: platform.MaskStreamKey(p.StreamKey),
		})
	}
	return options
}
