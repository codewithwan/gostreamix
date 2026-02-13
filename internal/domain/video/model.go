package video

import (
	"time"

	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Video struct {
	bun.BaseModel `bun:"table:videos,alias:v"`

	ID           uuid.UUID `bun:",pk,type:text" json:"id"`
	Filename     string    `bun:",notnull" json:"filename"`
	OriginalName string    `json:"original_name"`
	Size         int64     `json:"size"`
	Thumbnail    string    `json:"thumbnail"`
	Duration     int       `json:"duration"`
	CreatedAt    time.Time `bun:",nullzero,notnull,default:current_timestamp" json:"created_at"`
}

type Metadata struct {
	Duration   int
	Resolution string
	Bitrate    int
	FPS        int
}
