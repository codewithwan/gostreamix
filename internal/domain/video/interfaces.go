package video

import (
	"context"

	"github.com/google/uuid"
)

type Repository interface {
	Create(ctx context.Context, v *Video) error
	GetByID(ctx context.Context, id uuid.UUID) (*Video, error)
	List(ctx context.Context) ([]*Video, error)
	Update(ctx context.Context, v *Video) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type Service interface {
	GetVideos(ctx context.Context) ([]*Video, error)
	ProcessVideo(ctx context.Context, dto ProcessVideoDTO) (*Video, error)
	GetVideo(ctx context.Context, id uuid.UUID) (*Video, error)
	RenameVideo(ctx context.Context, id uuid.UUID, dto RenameVideoDTO) (*Video, error)
	MoveVideo(ctx context.Context, id uuid.UUID, dto MoveVideoDTO) (*Video, error)
	CopyVideo(ctx context.Context, id uuid.UUID, dto MoveVideoDTO) (*Video, error)
	DeleteVideo(ctx context.Context, id uuid.UUID) error
}
