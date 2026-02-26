package platform

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Platform struct {
	bun.BaseModel `bun:"table:platforms,alias:p"`

	ID           uuid.UUID `bun:"id,pk,type:uuid" json:"id"`
	UserID       uuid.UUID `bun:"user_id,type:uuid" json:"user_id"`
	Name         string    `bun:"name,notnull" json:"name"`
	PlatformType string    `bun:"platform_type,notnull" json:"platform_type"`
	StreamKey    string    `bun:"stream_key,notnull" json:"stream_key"`
	CustomURL    string    `bun:"custom_url" json:"custom_url"`
	Enabled      bool      `bun:"enabled,default:true" json:"enabled"`
	CreatedAt    time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt    time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp" json:"updated_at"`
}
