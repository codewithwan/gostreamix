package stream

import (
	"context"
	"strings"
	"time"

	"github.com/codewithwan/gostreamix/internal/infrastructure/activity"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

func (p *pipeline) updateStoredStatus(ctx context.Context, streamID uuid.UUID, status ProcessStatus) {
	if p.repo == nil {
		return
	}
	streamData, err := p.repo.GetByID(ctx, streamID)
	if err != nil || streamData == nil {
		return
	}
	streamData.Status = string(status)
	if err := p.repo.Update(ctx, streamData); err != nil {
		p.log.Warn("failed to persist stream status", zap.String("stream_id", streamID.String()), zap.String("status", string(status)), zap.Error(err))
	}
}

func (p *pipeline) emitLog(level, event string, streamID uuid.UUID, message string) {
	activity.Record(activity.Entry{
		Timestamp: time.Now().UTC(),
		Source:    "ffmpeg",
		Level:     normalizeLogLevel(level),
		Event:     event,
		Message:   message,
		StreamID:  streamID.String(),
	})

	p.hub.Broadcast("stream_log", map[string]interface{}{
		"stream_id":   streamID.String(),
		"level":       level,
		"event":       event,
		"message":     message,
		"occurred_at": time.Now().UTC().Format(time.RFC3339),
	})
}

func normalizeLogLevel(level string) string {
	normalized := strings.ToLower(strings.TrimSpace(level))
	switch normalized {
	case "error", "warning", "warn", "info":
		if normalized == "warn" {
			return "warning"
		}
		return normalized
	default:
		return "info"
	}
}

func looksLikeFFmpegError(line string) bool {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" {
		return false
	}

	lower := strings.ToLower(trimmed)
	return strings.Contains(lower, " error") ||
		strings.Contains(lower, "error ") ||
		strings.Contains(lower, "failed") ||
		strings.Contains(lower, "invalid") ||
		strings.Contains(lower, "cannot")
}
