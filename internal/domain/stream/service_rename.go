package stream

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

func (s *service) RenameStream(ctx context.Context, id uuid.UUID, dto RenameStreamDTO) (*Stream, error) {
	name := strings.TrimSpace(dto.Name)
	if name == "" {
		return nil, fmt.Errorf("stream name is required")
	}

	streamData, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get stream by id for rename: %w", err)
	}
	if streamData == nil {
		return nil, ErrStreamNotFound
	}

	streamData.Name = name
	if err := s.repo.Update(ctx, streamData); err != nil {
		return nil, fmt.Errorf("rename stream record: %w", err)
	}

	normalizeStreamSlices(streamData)
	return streamData, nil
}
