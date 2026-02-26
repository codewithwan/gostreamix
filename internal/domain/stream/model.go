package stream

import (
	"os/exec"
	"sync"
	"time"

	"github.com/codewithwan/gostreamix/internal/domain/stream/ffmpeg"
	"github.com/google/uuid"
	"github.com/uptrace/bun"
)

type Stream struct {
	bun.BaseModel `bun:"table:streams,alias:s"`

	ID          uuid.UUID `bun:",pk,type:text" json:"id"`
	VideoID     uuid.UUID `bun:",notnull,type:text" json:"video_id"`
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

type StreamProgram struct {
	bun.BaseModel `bun:"table:stream_programs,alias:sp"`

	ID          uuid.UUID   `bun:",pk,type:text" json:"id"`
	StreamID    uuid.UUID   `bun:",notnull,type:text,unique" json:"stream_id"`
	VideoIDs    []uuid.UUID `bun:",type:json" json:"video_ids"`
	RTMPTargets []string    `bun:",type:json" json:"rtmp_targets"`
	Bitrate     int         `json:"bitrate"`
	Resolution  string      `json:"resolution"`
	CreatedAt   time.Time   `bun:",nullzero,notnull,default:current_timestamp" json:"created_at"`
	UpdatedAt   time.Time   `bun:",nullzero,notnull,default:current_timestamp" json:"updated_at"`
}

type ProcessStatus string

const (
	StatusStarting ProcessStatus = "starting"
	StatusRunning  ProcessStatus = "running"
	StatusStopping ProcessStatus = "stopping"
	StatusStopped  ProcessStatus = "stopped"
	StatusError    ProcessStatus = "error"
)

type Process struct {
	ID           uuid.UUID
	Cmd          *exec.Cmd
	Status       ProcessStatus
	StartedAt    time.Time
	LastProgress *ffmpeg.Progress
	mu           sync.RWMutex
}

func (p *Process) SetStatus(status ProcessStatus) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.Status = status
}

func (p *Process) GetStatus() ProcessStatus {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.Status
}

func (p *Process) UpdateProgress(progress *ffmpeg.Progress) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.LastProgress = progress
}
