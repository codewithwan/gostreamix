package video

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

func (s *service) CopyVideo(ctx context.Context, id uuid.UUID, dto MoveVideoDTO) (*Video, error) {
	v, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get video by id for copy: %w", err)
	}

	folder := normalizeFolder(dto.Folder)
	originalName, err := s.nextCopyName(ctx, videoDisplayName(v), folder)
	if err != nil {
		return nil, err
	}

	clone, err := copyVideoFiles(v, originalName, folder)
	if err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, clone); err != nil {
		removeCopiedFiles(clone)
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

func copyVideoFiles(v *Video, originalName, folder string) (*Video, error) {
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

	return &Video{
		ID:           uuid.New(),
		Filename:     nextFilename,
		OriginalName: originalName,
		Folder:       folder,
		Size:         v.Size,
		Thumbnail:    nextThumb,
		Duration:     v.Duration,
	}, nil
}

func removeCopiedFiles(v *Video) {
	_ = os.Remove(filepath.Join("data", "uploads", v.Filename))
	if v.Thumbnail != "" {
		_ = os.Remove(filepath.Join("data", "thumbnails", v.Thumbnail))
	}
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
