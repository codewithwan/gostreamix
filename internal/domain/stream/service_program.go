package stream

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

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
		normalizeProgramSlices(program)
		return program, nil
	}

	videoIDs := make([]uuid.UUID, 0, 1)
	if streamData.VideoID != uuid.Nil {
		videoIDs = append(videoIDs, streamData.VideoID)
	}

	program = &StreamProgram{
		ID:          uuid.New(),
		StreamID:    streamData.ID,
		VideoIDs:    videoIDs,
		RTMPTargets: streamData.RTMPTargets,
		Bitrate:     streamData.Bitrate,
		Resolution:  streamData.Resolution,
		FPS:         streamData.FPS,
	}
	normalizeProgramSlices(program)
	return program, nil
}

func (s *service) SaveProgram(ctx context.Context, id uuid.UUID, dto SaveProgramDTO) (*StreamProgram, error) {
	streamData, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get stream by id for save program: %w", err)
	}
	if streamData == nil {
		return nil, ErrStreamNotFound
	}

	if err := applyProgramDefaults(&dto, streamData); err != nil {
		return nil, err
	}
	videoPaths, targets, err := s.validateProgram(ctx, dto.VideoIDs, dto.RTMPTargets, dto.Bitrate, dto.Resolution, dto.FPS)
	if err != nil {
		return nil, err
	}
	dto.RTMPTargets = targets

	program := programFromDTO(id, dto)
	applyProgramToStream(streamData, dto)

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

	normalizeProgramSlices(program)
	return program, nil
}

func applyProgramDefaults(dto *SaveProgramDTO, streamData *Stream) error {
	if len(dto.VideoIDs) == 0 {
		return fmt.Errorf("program must contain at least one video")
	}
	if len(dto.RTMPTargets) == 0 {
		return fmt.Errorf("program must contain at least one target")
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
	return nil
}

func programFromDTO(id uuid.UUID, dto SaveProgramDTO) *StreamProgram {
	return &StreamProgram{
		ID:          uuid.New(),
		StreamID:    id,
		VideoIDs:    dto.VideoIDs,
		RTMPTargets: dto.RTMPTargets,
		Bitrate:     dto.Bitrate,
		Resolution:  dto.Resolution,
		FPS:         dto.FPS,
	}
}

func applyProgramToStream(streamData *Stream, dto SaveProgramDTO) {
	streamData.VideoID = dto.VideoIDs[0]
	if name := strings.TrimSpace(dto.Name); name != "" {
		streamData.Name = name
	}
	streamData.RTMPTargets = dto.RTMPTargets
	streamData.Bitrate = dto.Bitrate
	streamData.Resolution = dto.Resolution
	streamData.FPS = dto.FPS
}
