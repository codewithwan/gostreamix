package video

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
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

func (s *service) RenameVideo(ctx context.Context, id uuid.UUID, dto RenameVideoDTO) (*Video, error) {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get video by id for rename: %w", err)
	}

	name := strings.TrimSpace(dto.Name)
	if name == "" {
		return nil, fmt.Errorf("video name is required")
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

	v.Folder = normalizeFolder(dto.Folder)
	if err := s.repo.Update(ctx, v); err != nil {
		return nil, fmt.Errorf("move video: %w", err)
	}
	return v, nil
}

func (s *service) CopyVideo(ctx context.Context, id uuid.UUID, dto MoveVideoDTO) (*Video, error) {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get video by id for copy: %w", err)
	}

	ext := filepath.Ext(v.Filename)
	nextFilename := uuid.New().String() + ext
	if err := copyFile(filepath.Join("data", "uploads", v.Filename), filepath.Join("data", "uploads", nextFilename)); err != nil {
		return nil, fmt.Errorf("copy video file: %w", err)
	}

	nextThumb := ""
	if v.Thumbnail != "" {
		nextThumb = nextFilename + ".jpg"
		if err := copyFile(filepath.Join("data", "thumbnails", v.Thumbnail), filepath.Join("data", "thumbnails", nextThumb)); err != nil {
			nextThumb = ""
		}
	}

	clone := &Video{
		ID:           uuid.New(),
		Filename:     nextFilename,
		OriginalName: v.OriginalName,
		Folder:       normalizeFolder(dto.Folder),
		Size:         v.Size,
		Thumbnail:    nextThumb,
		Duration:     v.Duration,
	}
	if err := s.repo.Create(ctx, clone); err != nil {
		_ = os.Remove(filepath.Join("data", "uploads", nextFilename))
		if nextThumb != "" {
			_ = os.Remove(filepath.Join("data", "thumbnails", nextThumb))
		}
		return nil, fmt.Errorf("create copied video record: %w", err)
	}
	return clone, nil
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

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Sync()
}
