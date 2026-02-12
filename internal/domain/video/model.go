package video

import (
	"time"

	"github.com/uptrace/bun"
)

type Video struct {
	bun.BaseModel `bun:"table:videos,alias:v"`

	ID        int64     `bun:",pk,autoincrement" json:"id"`
	Filename  string    `bun:",notnull" json:"filename"`
	Thumbnail string    `json:"thumbnail"`
	Duration  int       `json:"duration"`
	CreatedAt time.Time `bun:",nullzero,notnull,default:current_timestamp" json:"created_at"`
}
