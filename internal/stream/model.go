package stream

import (
	"time"

	"github.com/uptrace/bun"
)

type Stream struct {
	bun.BaseModel `bun:"table:streams,alias:s"`

	ID          int64     `bun:",pk,autoincrement" json:"id"`
	Name        string    `bun:",notnull" json:"name"`
	RTMPTargets []string  `bun:",type:json" json:"rtmp_targets"`
	Bitrate     int       `json:"bitrate"`
	Resolution  string    `json:"resolution"`
	FPS         int       `json:"fps"`
	Loop        bool      `json:"loop"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `bun:",nullzero,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt   time.Time `bun:",nullzero,notnull,default:current_timestamp" json:"updated_at"`
}

type Video struct {
	bun.BaseModel `bun:"table:videos,alias:v"`

	ID        int64     `bun:",pk,autoincrement" json:"id"`
	Filename  string    `bun:",notnull" json:"filename"`
	Thumbnail string    `json:"thumbnail"`
	Duration  int       `json:"duration"`
	CreatedAt time.Time `bun:",nullzero,notnull,default:current_timestamp" json:"created_at"`
}
