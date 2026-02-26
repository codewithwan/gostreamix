package video

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

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

func (s *service) ProcessVideo(ctx context.Context, dto ProcessVideoDTO) (*Video, error) {
	meta, err := ProbeVideo(dto.Path)
	if err != nil {
		meta = &Metadata{
			Duration:   0,
			Resolution: "unknown",
			Bitrate:    0,
			FPS:        0,
		}
		fmt.Printf("Warning: failed to probe video: %v\n", err)
	}

	info, err := os.Stat(dto.Path)
	if err != nil {
		return nil, fmt.Errorf("stat video file: %w", err)
	}

	thumbName := dto.Filename + ".jpg"
	thumbPath := filepath.Join("data", "thumbnails", thumbName)
	if err := GenerateThumbnail(dto.Path, thumbPath); err != nil {
		fmt.Printf("Warning: failed to generate thumbnail: %v\n", err)
		thumbName = ""
	}

	v := &Video{
		ID:           uuid.New(),
		Filename:     dto.Filename,
		OriginalName: dto.OriginalName,
		Folder:       dto.Folder,
		Size:         info.Size(),
		Thumbnail:    thumbName,
		Duration:     meta.Duration,
	}

	if err := s.repo.Create(ctx, v); err != nil {
		return nil, fmt.Errorf("create video record: %w", err)
	}

	return v, nil
}

func (s *service) AddVideo(ctx context.Context, v *Video) error {
	if v.ID == uuid.Nil {
		v.ID = uuid.New()
	}
	return s.repo.Create(ctx, v)
}

func (s *service) DeleteVideo(ctx context.Context, id uuid.UUID) error {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get video by id for deletion: %w", err)
	}

	_ = os.Remove(filepath.Join("data", "uploads", v.Filename))
	_ = os.Remove(filepath.Join("data", "thumbnails", v.Thumbnail))

	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("delete video record: %w", err)
	}
	return nil
}
