package stream

import (
	"context"

	"github.com/google/uuid"
)

func (s *service) GetStreamStats(ctx context.Context, id uuid.UUID) (interface{}, error) {
	proc, ok := s.pm.Get(id)
	if !ok {
		return map[string]interface{}{"status": "stopped"}, nil
	}

	return map[string]interface{}{
		"status":      proc.GetStatus(),
		"started_at":  proc.StartedAt,
		"progress":    proc.LastProgress,
		"last_error":  proc.GetLastError(),
		"last_output": proc.GetLastOutput(),
	}, nil
}
