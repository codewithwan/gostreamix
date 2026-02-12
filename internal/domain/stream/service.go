package stream

import (
	"context"
)

type service struct {
	repo     Repository
	pipeline Pipeline
}

func NewService(repo Repository, pipeline Pipeline) Service {
	return &service{repo: repo, pipeline: pipeline}
}

func (s *service) CreateStream(ctx context.Context, dto CreateStreamDTO) (*Stream, error) {
	stream := &Stream{
		Name:        dto.Name,
		RTMPTargets: dto.RTMPTargets,
		Bitrate:     dto.Bitrate,
		Resolution:  dto.Resolution,
		FPS:         dto.FPS,
		Loop:        dto.Loop,
		Status:      "idle",
	}
	err := s.repo.Create(ctx, stream)
	return stream, err
}

func (s *service) StartStream(ctx context.Context, id int64) error {
	stream, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ErrStreamNotFound
	}
	return s.pipeline.Start(ctx, stream)
}

func (s *service) StopStream(ctx context.Context, id int64) error {
	stream, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ErrStreamNotFound
	}
	return s.pipeline.Stop(ctx, stream)
}

func (s *service) GetStreams(ctx context.Context) ([]*Stream, error) {
	return s.repo.List(ctx)
}
