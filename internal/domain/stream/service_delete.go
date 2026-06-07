package stream

import (
	"context"
	"fmt"

	"github.com/google/uuid"
)

func (s *service) DeleteStream(ctx context.Context, id uuid.UUID) error {
	_ = s.StopStream(ctx, id)
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("delete stream record: %w", err)
	}
	return nil
}
