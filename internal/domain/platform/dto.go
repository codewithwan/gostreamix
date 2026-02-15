package platform

import (
	"errors"
	"strings"
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
	if strings.TrimSpace(d.StreamKey) == "" {
		return ErrValidationKeyRequired
	}
	return nil
}
