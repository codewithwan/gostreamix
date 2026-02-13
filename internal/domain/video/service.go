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
	return s.repo.List(ctx)
}

func (s *service) ProcessVideo(ctx context.Context, filename, originalName, path string) (*Video, error) {
	meta, err := ProbeVideo(path)
	if err != nil {
		meta = &Metadata{
			Duration:   0,
			Resolution: "unknown",
			Bitrate:    0,
			FPS:        0,
		}
		fmt.Printf("Warning: failed to probe video: %v\n", err)
	}

	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}

	thumbName := filename + ".jpg"
	thumbPath := filepath.Join("data", "thumbnails", thumbName)
	if err := GenerateThumbnail(path, thumbPath); err != nil {
		fmt.Printf("Warning: failed to generate thumbnail: %v\n", err)
		thumbName = ""
	}

	v := &Video{
		ID:           uuid.New(),
		Filename:     filename,
		OriginalName: originalName,
		Size:         info.Size(),
		Thumbnail:    thumbName,
		Duration:     meta.Duration,
	}

	if err := s.repo.Create(ctx, v); err != nil {
		return nil, err
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
		return err
	}

	_ = os.Remove(filepath.Join("data", "uploads", v.Filename))
	_ = os.Remove(filepath.Join("data", "thumbnails", v.Thumbnail))

	return s.repo.Delete(ctx, id)
}
