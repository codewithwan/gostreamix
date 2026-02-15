package pages

import "github.com/google/uuid"

type PlatformView struct {
	ID           uuid.UUID
	Name         string
	PlatformType string
	StreamKey    string
	CustomURL    string
	Enabled      bool
}
