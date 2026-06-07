package stream

import (
	"strings"

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
		baseURL = defaultRTMPBase(platformType)
	}
	if baseURL == "" || streamKey == "" {
		return baseURL
	}
	if strings.HasSuffix(baseURL, "/") {
		return baseURL + streamKey
	}
	return baseURL + "/" + streamKey
}

func defaultRTMPBase(platformType string) string {
	switch platformType {
	case "youtube":
		return "rtmp://a.rtmp.youtube.com/live2"
	case "twitch":
		return "rtmp://live.twitch.tv/app"
	case "facebook":
		return "rtmps://live-api-s.facebook.com:443/rtmp"
	case "tiktok":
		return "rtmp://push-rtmp-global.tiktok.com/live"
	default:
		return ""
	}
}
