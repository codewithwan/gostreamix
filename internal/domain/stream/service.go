package stream

import (
	"context"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/google/uuid"
)

var resolutionPattern = regexp.MustCompile(`^(\d{2,5})x(\d{2,5})$`)

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
		FPS:         streamData.FPS,
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
	if dto.FPS <= 0 {
		dto.FPS = streamData.FPS
	}
	videoPaths, targets, err := s.validateProgram(ctx, dto.VideoIDs, dto.RTMPTargets, dto.Bitrate, dto.Resolution, dto.FPS)
	if err != nil {
		return nil, err
	}
	dto.RTMPTargets = targets

	program := &StreamProgram{
		ID:          uuid.New(),
		StreamID:    id,
		VideoIDs:    dto.VideoIDs,
		RTMPTargets: dto.RTMPTargets,
		Bitrate:     dto.Bitrate,
		Resolution:  dto.Resolution,
		FPS:         dto.FPS,
	}

	streamData.VideoID = dto.VideoIDs[0]
	if name := strings.TrimSpace(dto.Name); name != "" {
		streamData.Name = name
	}
	streamData.RTMPTargets = dto.RTMPTargets
	streamData.Bitrate = dto.Bitrate
	streamData.Resolution = dto.Resolution
	streamData.FPS = dto.FPS

	if dto.ApplyLiveNow {
		if _, running := s.pm.Get(id); running {
			if err := s.pipeline.Reload(ctx, streamData, videoPaths); err != nil {
				return nil, fmt.Errorf("reload pipeline from saved program: %w", err)
			}
		}
	}

	if err := s.repo.UpsertProgram(ctx, program); err != nil {
		return nil, fmt.Errorf("upsert stream program: %w", err)
	}
	if err := s.repo.Update(ctx, streamData); err != nil {
		return nil, fmt.Errorf("update stream from program: %w", err)
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
	for _, streamData := range streams {
		if streamData == nil {
			continue
		}
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

func (s *service) GetStreamStats(ctx context.Context, id uuid.UUID) (interface{}, error) {
	proc, ok := s.pm.Get(id)
	if !ok {
		return map[string]interface{}{"status": "stopped"}, nil
	}

	return map[string]interface{}{
		"status":      proc.GetStatus(),
		"started_at":  proc.StartedAt,
		"progress":    proc.LastProgress,
		"last_error":  proc.GetLastError(),
		"last_output": proc.GetLastOutput(),
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

func (s *service) validateProgram(ctx context.Context, videoIDs []uuid.UUID, targets []string, bitrate int, resolution string, fps int) ([]string, []string, error) {
	if len(videoIDs) == 0 {
		return nil, nil, ErrStreamProgramEmpty
	}
	videoPaths := make([]string, 0, len(videoIDs))
	for _, id := range videoIDs {
		if id == uuid.Nil {
			return nil, nil, fmt.Errorf("program contains an empty video id")
		}
		videoData, err := s.videoRepo.GetByID(ctx, id)
		if err != nil {
			return nil, nil, fmt.Errorf("video %s was not found: %w", id.String(), err)
		}
		if videoData == nil || strings.TrimSpace(videoData.Filename) == "" {
			return nil, nil, fmt.Errorf("video %s is invalid", id.String())
		}
		videoPath := filepath.Join("data", "uploads", videoData.Filename)
		if _, err := os.Stat(videoPath); err != nil {
			return nil, nil, fmt.Errorf("source file for %s is missing: %w", videoDisplayName(videoData), err)
		}
		videoPaths = append(videoPaths, videoPath)
	}

	cleanTargets, err := cleanRTMPTargets(targets)
	if err != nil {
		return nil, nil, err
	}
	if bitrate < 500 || bitrate > 12000 {
		return nil, nil, fmt.Errorf("bitrate must be between 500 and 12000 kbps")
	}
	if fps != 0 && (fps < 15 || fps > 120) {
		return nil, nil, fmt.Errorf("fps must be between 15 and 120")
	}
	if err := validateResolution(resolution); err != nil {
		return nil, nil, err
	}
	return videoPaths, cleanTargets, nil
}

func cleanRTMPTargets(targets []string) ([]string, error) {
	seen := make(map[string]struct{}, len(targets))
	clean := make([]string, 0, len(targets))
	for _, raw := range targets {
		target := strings.TrimSpace(raw)
		if target == "" {
			continue
		}
		parsed, err := url.Parse(target)
		if err != nil || parsed.Host == "" {
			return nil, fmt.Errorf("invalid RTMP target: %s", target)
		}
		if parsed.Scheme != "rtmp" && parsed.Scheme != "rtmps" {
			return nil, fmt.Errorf("target must start with rtmp:// or rtmps://")
		}
		if _, exists := seen[target]; exists {
			continue
		}
		seen[target] = struct{}{}
		clean = append(clean, target)
	}
	if len(clean) == 0 {
		return nil, fmt.Errorf("program must contain at least one target")
	}
	return clean, nil
}

func validateResolution(resolution string) error {
	match := resolutionPattern.FindStringSubmatch(strings.TrimSpace(resolution))
	if match == nil {
		return fmt.Errorf("resolution must use WIDTHxHEIGHT format")
	}
	width, _ := strconv.Atoi(match[1])
	height, _ := strconv.Atoi(match[2])
	if width < 160 || height < 120 || width > 7680 || height > 4320 {
		return fmt.Errorf("resolution is outside the supported range")
	}
	return nil
}

func videoDisplayName(v *video.Video) string {
	name := strings.TrimSpace(v.OriginalName)
	if name != "" {
		return name
	}
	return strings.TrimSpace(v.Filename)
}
