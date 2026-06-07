package video

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) GetVideos(ctx context.Context) ([]*Video, error) {
	videos, err := s.repo.List(ctx)
	if err != nil {
		return nil, fmt.Errorf("list videos: %w", err)
	}
	return videos, nil
}

func (s *service) GetVideo(ctx context.Context, id uuid.UUID) (*Video, error) {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get video by id: %w", err)
	}
	return v, nil
}

func (s *service) AddVideo(ctx context.Context, v *Video) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return s.repo.Create(ctx, v)
}

func (s *service) RenameVideo(ctx context.Context, id uuid.UUID, dto RenameVideoDTO) (*Video, error) {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get video by id for rename: %w", err)
	}

	name := strings.TrimSpace(dto.Name)
	if name == "" {
		return nil, fmt.Errorf("video name is required")
	}
	if err := s.ensureUniqueVideoName(ctx, name, normalizeFolder(v.Folder), v.ID); err != nil {
		return nil, err
	}
	v.OriginalName = name

	if err := s.repo.Update(ctx, v); err != nil {
		return nil, fmt.Errorf("rename video: %w", err)
	}
	return v, nil
}

func (s *service) MoveVideo(ctx context.Context, id uuid.UUID, dto MoveVideoDTO) (*Video, error) {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get video by id for move: %w", err)
	}

	nextFolder := normalizeFolder(dto.Folder)
	if err := s.ensureUniqueVideoName(ctx, videoDisplayName(v), nextFolder, v.ID); err != nil {
		return nil, err
	}
	v.Folder = nextFolder
	if err := s.repo.Update(ctx, v); err != nil {
		return nil, fmt.Errorf("move video: %w", err)
	}
	return v, nil
}
