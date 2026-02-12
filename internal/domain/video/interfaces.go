package video

import (
	"context"
)

type Repository interface {
	Create(ctx context.Context, v *Video) error
	List(ctx context.Context) ([]*Video, error)
	Delete(ctx context.Context, id int64) error
}

type Service interface {
	GetVideos(ctx context.Context) ([]*Video, error)
	AddVideo(ctx context.Context, v *Video) error
	DeleteVideo(ctx context.Context, id int64) error
}
