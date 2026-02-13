package stream

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	Create(ctx context.Context, s *Stream) error
	GetByID(ctx context.Context, id uuid.UUID) (*Stream, error)
	List(ctx context.Context) ([]*Stream, error)
	Update(ctx context.Context, s *Stream) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type Service interface {
	CreateStream(ctx context.Context, dto CreateStreamDTO) (*Stream, error)
	GetStreams(ctx context.Context) ([]*Stream, error)
	GetStream(ctx context.Context, id uuid.UUID) (*Stream, error)
	DeleteStream(ctx context.Context, id uuid.UUID) error
	StartStream(ctx context.Context, id uuid.UUID) error
	StopStream(ctx context.Context, id uuid.UUID) error
	GetStreamStats(ctx context.Context, id uuid.UUID) (interface{}, error)
}

type Pipeline interface {
	Start(ctx context.Context, s *Stream, videoPath string) error
	Stop(ctx context.Context, s *Stream) error
}
