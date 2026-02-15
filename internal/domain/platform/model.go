package platform

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Platform struct {
	bun.BaseModel `bun:"table:platforms,alias:p"`

	ID           uuid.UUID `bun:"id,pk,type:uuid"`
	UserID       uuid.UUID `bun:"user_id,type:uuid"`
	Name         string    `bun:"name,notnull"`
	PlatformType string    `bun:"platform_type,notnull"`
	// StreamKey is stored in plain text. This is acceptable for self-hosted
	// deployments but should be encrypted if deployed in a multi-tenant environment.
	StreamKey string    `bun:"stream_key,notnull"`
	CustomURL string    `bun:"custom_url"`
	Enabled   bool      `bun:"enabled,default:true"`
	CreatedAt time.Time `bun:"created_at,nullzero,notnull,default:current_timestamp"`
	UpdatedAt time.Time `bun:"updated_at,nullzero,notnull,default:current_timestamp"`
}
