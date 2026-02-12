package stream

import (
	"context"
)

type Repository interface {
	Create(ctx context.Context, stream *Stream) error
	GetByID(ctx context.Context, id int64) (*Stream, error)
	List(ctx context.Context) ([]*Stream, error)
	Update(ctx context.Context, stream *Stream) error
	Delete(ctx context.Context, id int64) error
}

type Service interface {
	CreateStream(ctx context.Context, dto CreateStreamDTO) (*Stream, error)
	StartStream(ctx context.Context, id int64) error
	StopStream(ctx context.Context, id int64) error
	GetStreams(ctx context.Context) ([]*Stream, error)
}

type Pipeline interface {
	Start(ctx context.Context, s *Stream) error
	Stop(ctx context.Context, s *Stream) error
}
