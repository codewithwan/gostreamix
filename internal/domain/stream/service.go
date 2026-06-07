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

	videoIDs := make([]uuid.UUID, 0, 1)
	if dto.VideoID != uuid.Nil {
		videoIDs = append(videoIDs, dto.VideoID)
	}

	program := &StreamProgram{
		ID:          uuid.New(),
		StreamID:    stream.ID,
		VideoIDs:    videoIDs,
		RTMPTargets: stream.RTMPTargets,
		Bitrate:     stream.Bitrate,
		Resolution:  stream.Resolution,
		FPS:         stream.FPS,
	}
	if err := s.repo.UpsertProgram(ctx, program); err != nil {
		return nil, fmt.Errorf("create stream program: %w", err)
	}

	normalizeStreamSlices(stream)
	return stream, nil
}

func (s *service) UpdateStream(ctx context.Context, id uuid.UUID, dto UpdateStreamDTO) (*Stream, error) {
	stream, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get stream by id for update: %w", err)
	}
	if stream == nil {
		return nil, ErrStreamNotFound
	}

	stream.VideoID = dto.VideoID
	stream.Name = dto.Name
	stream.RTMPTargets = dto.RTMPTargets
	stream.Bitrate = dto.Bitrate
	stream.Resolution = dto.Resolution
	stream.FPS = dto.FPS
	stream.Loop = dto.Loop

	if err := s.repo.Update(ctx, stream); err != nil {
		return nil, fmt.Errorf("update stream record: %w", err)
	}

	if _, running := s.pm.Get(id); running {
		video, err := s.videoRepo.GetByID(ctx, stream.VideoID)
		if err != nil {
			return nil, fmt.Errorf("get video for live update: %w", err)
		}

		videoPath := filepath.Join("data", "uploads", video.Filename)
		if err := s.pipeline.Reload(ctx, stream, []string{videoPath}); err != nil {
			return nil, fmt.Errorf("reload live pipeline: %w", err)
		}
	}

	normalizeStreamSlices(stream)
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

	program, err := s.repo.GetProgram(ctx, id)
	if err != nil {
		return fmt.Errorf("get stream program: %w", err)
	}

	videoIDs := make([]uuid.UUID, 0, 1)
	if program != nil {
		if len(program.VideoIDs) > 0 {
			videoIDs = program.VideoIDs
		}
		if len(program.RTMPTargets) > 0 {
			stream.RTMPTargets = program.RTMPTargets
		}
		if program.Bitrate > 0 {
			stream.Bitrate = program.Bitrate
		}
		if program.Resolution != "" {
			stream.Resolution = program.Resolution
		}
		if program.FPS > 0 {
			stream.FPS = program.FPS
		}
	}

	if len(videoIDs) == 0 && stream.VideoID != uuid.Nil {
		videoIDs = append(videoIDs, stream.VideoID)
	}
	if len(videoIDs) == 0 {
		return ErrStreamProgramEmpty
	}

	videoPaths, targets, err := s.validateProgram(ctx, videoIDs, stream.RTMPTargets, stream.Bitrate, stream.Resolution, stream.FPS)
	if err != nil {
		return err
	}
	stream.RTMPTargets = targets

	if err := s.pipeline.Start(ctx, stream, videoPaths); err != nil {
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
	for _, streamData := range streams {
		if streamData == nil {
			continue
		}
		normalizeStreamSlices(streamData)
		if proc, ok := s.pm.Get(streamData.ID); ok {
			streamData.Status = string(proc.GetStatus())
			continue
		}
		switch streamData.Status {
		case string(StatusRunning), string(StatusStarting), string(StatusStopping):
			streamData.Status = string(StatusStopped)
		}
	}
	return streams, nil
}

func (s *service) GetStream(ctx context.Context, id uuid.UUID) (*Stream, error) {
	stream, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get stream by id: %w", err)
	}
	normalizeStreamSlices(stream)
	return stream, nil
}
