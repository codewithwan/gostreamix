package video

import (
	"context"
)

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) GetVideos(ctx context.Context) ([]*Video, error) {
	return s.repo.List(ctx)
}

func (s *service) AddVideo(ctx context.Context, v *Video) error {
	return s.repo.Create(ctx, v)
}

func (s *service) DeleteVideo(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
