package platform

import (
	"errors"
	"strings"

	"github.com/google/uuid"
)

var (
	ErrValidationNameRequired = errors.New("platform name is required")
	ErrValidationTypeRequired = errors.New("platform type is required")
	ErrValidationKeyRequired  = errors.New("stream key is required")
	ErrValidationNameTooLong  = errors.New("platform name must be less than 50 characters")
)

type CreatePlatformDTO struct {
	Name         string `json:"name" form:"name"`
	PlatformType string `json:"platform_type" form:"platform_type"`
	StreamKey    string `json:"stream_key" form:"stream_key"`
	CustomURL    string `json:"custom_url" form:"custom_url"`
}

func (d *CreatePlatformDTO) Validate() error {
	if strings.TrimSpace(d.Name) == "" {
		return ErrValidationNameRequired
	}
	if len(d.Name) > 50 {
		return ErrValidationNameTooLong
	}
	if strings.TrimSpace(d.PlatformType) == "" {
		return ErrValidationTypeRequired
	}
	if strings.TrimSpace(d.StreamKey) == "" {
		return ErrValidationKeyRequired
	}
	return nil
}

type UpdatePlatformDTO struct {
	Name         string `json:"name" form:"name"`
	PlatformType string `json:"platform_type" form:"platform_type"`
	StreamKey    string `json:"stream_key" form:"stream_key"`
	CustomURL    string `json:"custom_url" form:"custom_url"`
}

func (d *UpdatePlatformDTO) Validate() error {
	if strings.TrimSpace(d.Name) == "" {
		return ErrValidationNameRequired
	}
	if len(d.Name) > 50 {
		return ErrValidationNameTooLong
	}
	if strings.TrimSpace(d.PlatformType) == "" {
		return ErrValidationTypeRequired
	}
	return nil
}

type PlatformResponse struct {
	ID           uuid.UUID `json:"id"`
	UserID       uuid.UUID `json:"user_id"`
	Name         string    `json:"name"`
	PlatformType string    `json:"platform_type"`
	StreamKey    string    `json:"stream_key"`
	CustomURL    string    `json:"custom_url"`
	RTMPURL      string    `json:"rtmp_url"`
	Color        string    `json:"color"`
	Enabled      bool      `json:"enabled"`
}

func ToPlatformResponse(p *Platform) PlatformResponse {
	return PlatformResponse{
		ID:           p.ID,
		UserID:       p.UserID,
		Name:         p.Name,
		PlatformType: p.PlatformType,
		StreamKey:    MaskStreamKey(p.StreamKey),
		CustomURL:    p.CustomURL,
		RTMPURL:      MaskRTMPTarget(BuildRTMPTarget(p.PlatformType, p.CustomURL, p.StreamKey), p.StreamKey),
		Color:        p.Color,
		Enabled:      p.Enabled,
	}
}

func ToPlatformResponses(platforms []*Platform) []PlatformResponse {
	responses := make([]PlatformResponse, 0, len(platforms))
	for _, p := range platforms {
		if p != nil {
			responses = append(responses, ToPlatformResponse(p))
		}
	}
	return responses
}

func MaskStreamKey(key string) string {
	key = strings.TrimSpace(key)
	if key == "" {
		return ""
	}
	if len(key) <= 4 {
		return "****"
	}
	return "****" + key[len(key)-4:]
}

func MaskRTMPTarget(target, key string) string {
	key = strings.TrimSpace(key)
	if target == "" || key == "" {
		return target
	}
	return strings.Replace(target, key, MaskStreamKey(key), 1)
}

func BuildRTMPTarget(platformType, baseURL, streamKey string) string {
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
