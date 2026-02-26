package monitor

import (
	"time"

	"github.com/uptrace/bun"
)

type Stats struct {
	CPU    float64 `json:"cpu"`
	Memory float64 `json:"memory"`
	Disk   float64 `json:"disk"`
}

type MetricSample struct {
	bun.BaseModel `bun:"table:metric_samples,alias:ms"`

	ID         int64     `bun:",pk,autoincrement" json:"id"`
	CPU        float64   `json:"cpu"`
	Memory     float64   `json:"memory"`
	Disk       float64   `json:"disk"`
	RecordedAt time.Time `bun:",nullzero,notnull,default:current_timestamp" json:"recorded_at"`
}
