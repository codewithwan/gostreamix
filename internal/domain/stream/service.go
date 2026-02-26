package stream

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

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
	}
	if err := s.repo.UpsertProgram(ctx, program); err != nil {
		return nil, fmt.Errorf("create stream program: %w", err)
	}

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
		if err := s.pipeline.Reload(ctx, stream, videoPath); err != nil {
			return nil, fmt.Errorf("reload live pipeline: %w", err)
		}
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

	program, err := s.repo.GetProgram(ctx, id)
	if err != nil {
		return fmt.Errorf("get stream program: %w", err)
	}

	videoID := stream.VideoID
	if program != nil {
		if len(program.VideoIDs) > 0 {
			videoID = program.VideoIDs[0]
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
	}

	if videoID == uuid.Nil {
		return ErrStreamProgramEmpty
	}

	video, err := s.videoRepo.GetByID(ctx, videoID)
	if err != nil {
		return fmt.Errorf("video not found: %w", err)
	}

	videoPath := filepath.Join("data", "uploads", video.Filename)

	if err := s.pipeline.Start(ctx, stream, videoPath); err != nil {
		return fmt.Errorf("start stream pipeline: %w", err)
	}
	return nil
}

func (s *service) GetProgram(ctx context.Context, id uuid.UUID) (*StreamProgram, error) {
	streamData, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get stream by id for program: %w", err)
	}
	if streamData == nil {
		return nil, ErrStreamNotFound
	}

	program, err := s.repo.GetProgram(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get stream program: %w", err)
	}
	if program != nil {
		return program, nil
	}

	videoIDs := make([]uuid.UUID, 0, 1)
	if streamData.VideoID != uuid.Nil {
		videoIDs = append(videoIDs, streamData.VideoID)
	}

	return &StreamProgram{
		ID:          uuid.New(),
		StreamID:    streamData.ID,
		VideoIDs:    videoIDs,
		RTMPTargets: streamData.RTMPTargets,
		Bitrate:     streamData.Bitrate,
		Resolution:  streamData.Resolution,
	}, nil
}

func (s *service) SaveProgram(ctx context.Context, id uuid.UUID, dto SaveProgramDTO) (*StreamProgram, error) {
	streamData, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get stream by id for save program: %w", err)
	}
	if streamData == nil {
		return nil, ErrStreamNotFound
	}
	if len(dto.VideoIDs) == 0 {
		return nil, fmt.Errorf("program must contain at least one video")
	}
	if len(dto.RTMPTargets) == 0 {
		return nil, fmt.Errorf("program must contain at least one target")
	}
	if dto.Bitrate <= 0 {
		dto.Bitrate = streamData.Bitrate
	}
	if strings.TrimSpace(dto.Resolution) == "" {
		dto.Resolution = streamData.Resolution
	}

	program := &StreamProgram{
		ID:          uuid.New(),
		StreamID:    id,
		VideoIDs:    dto.VideoIDs,
		RTMPTargets: dto.RTMPTargets,
		Bitrate:     dto.Bitrate,
		Resolution:  dto.Resolution,
	}
	if err := s.repo.UpsertProgram(ctx, program); err != nil {
		return nil, fmt.Errorf("upsert stream program: %w", err)
	}

	streamData.VideoID = dto.VideoIDs[0]
	if name := strings.TrimSpace(dto.Name); name != "" {
		streamData.Name = name
	}
	streamData.RTMPTargets = dto.RTMPTargets
	streamData.Bitrate = dto.Bitrate
	streamData.Resolution = dto.Resolution
	if err := s.repo.Update(ctx, streamData); err != nil {
		return nil, fmt.Errorf("update stream from program: %w", err)
	}

	if dto.ApplyLiveNow {
		if _, running := s.pm.Get(id); running {
			videoData, err := s.videoRepo.GetByID(ctx, dto.VideoIDs[0])
			if err != nil {
				return nil, fmt.Errorf("get first video for apply live: %w", err)
			}
			videoPath := filepath.Join("data", "uploads", videoData.Filename)
			if err := s.pipeline.Reload(ctx, streamData, videoPath); err != nil {
				return nil, fmt.Errorf("reload pipeline from saved program: %w", err)
			}
		}
	}

	return program, nil
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
