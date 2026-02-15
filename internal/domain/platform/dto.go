package platform

type CreatePlatformDTO struct {
	Name         string `json:"name" form:"name"`
	PlatformType string `json:"platform_type" form:"platform_type"`
	StreamKey    string `json:"stream_key" form:"stream_key"`
	CustomURL    string `json:"custom_url" form:"custom_url"`
}

type UpdatePlatformDTO struct {
	Name         string `json:"name" form:"name"`
	PlatformType string `json:"platform_type" form:"platform_type"`
	StreamKey    string `json:"stream_key" form:"stream_key"`
	CustomURL    string `json:"custom_url" form:"custom_url"`
}
