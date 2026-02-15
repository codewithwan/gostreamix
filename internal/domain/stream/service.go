package stream

import (
	"context"
	"fmt"
	"path/filepath"

	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/google/uuid"
)

type service struct {
	repo      Repository
	videoRepo video.Repository
	pipeline  Pipeline
	pm        *ProcessManager
}

func NewService(repo Repository, videoRepo video.Repository, pipeline Pipeline, pm *ProcessManager) Service {
	return &service{
		repo:      repo,
		videoRepo: videoRepo,
		pipeline:  pipeline,
		pm:        pm,
	}
}

func (s *service) CreateStream(ctx context.Context, dto CreateStreamDTO) (*Stream, error) {
	stream := &Stream{
		ID:          uuid.New(),
		VideoID:     dto.VideoID,
		Name:        dto.Name,
		RTMPTargets: dto.RTMPTargets,
		Bitrate:     dto.Bitrate,
		Resolution:  dto.Resolution,
		FPS:         dto.FPS,
		Loop:        dto.Loop,
		Status:      "idle",
	}
	if err := s.repo.Create(ctx, stream); err != nil {
		return nil, fmt.Errorf("create stream record: %w", err)
	}
	return stream, nil
}

func (s *service) StartStream(ctx context.Context, id uuid.UUID) error {
	stream, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get stream by id: %w", err)
	}
	if stream == nil {
		return ErrStreamNotFound
	}

	video, err := s.videoRepo.GetByID(ctx, stream.VideoID)
	if err != nil {
		return fmt.Errorf("video not found: %w", err)
	}

	videoPath := filepath.Join("data", "uploads", video.Filename)

	if err := s.pipeline.Start(ctx, stream, videoPath); err != nil {
		return fmt.Errorf("start stream pipeline: %w", err)
	}
	return nil
}

func (s *service) StopStream(ctx context.Context, id uuid.UUID) error {
	stream, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get stream by id for stopping: %w", err)
	}
	if stream == nil {
		return ErrStreamNotFound
	}
	if err := s.pipeline.Stop(ctx, stream); err != nil {
		return fmt.Errorf("stop stream pipeline: %w", err)
	}
	return nil
}

func (s *service) GetStreams(ctx context.Context) ([]*Stream, error) {
	streams, err := s.repo.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("list streams: %w", err)
	}
	return streams, nil
}

func (s *service) GetStreamStats(ctx context.Context, id uuid.UUID) (interface{}, error) {
	proc, ok := s.pm.Get(id)
	if !ok {
		return map[string]interface{}{"status": "stopped"}, nil
	}

	return map[string]interface{}{
		"status":     proc.GetStatus(),
		"started_at": proc.StartedAt,
		"progress":   proc.LastProgress,
	}, nil
}

func (s *service) GetStream(ctx context.Context, id uuid.UUID) (*Stream, error) {
	stream, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get stream by id: %w", err)
	}
	return stream, nil
}

func (s *service) DeleteStream(ctx context.Context, id uuid.UUID) error {
	_ = s.StopStream(ctx, id)
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("delete stream record: %w", err)
	}
	return nil
}
