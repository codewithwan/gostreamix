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
	folder := normalizeFolder(dto.Folder)
	originalName := strings.TrimSpace(dto.OriginalName)
	if originalName == "" {
		originalName = dto.Filename
	}
	if err := s.ensureUniqueVideoName(ctx, originalName, folder, uuid.Nil); err != nil {
		return nil, err
	}

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
		OriginalName: originalName,
		Folder:       folder,
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
		OriginalName: originalName,
		Folder:       folder,
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

func (s *service) ensureUniqueVideoName(ctx context.Context, name string, folder string, excludeID uuid.UUID) error {
	videos, err := s.repo.List(ctx)
	if err != nil {
		return fmt.Errorf("check duplicate video name: %w", err)
	}

	candidate := strings.TrimSpace(name)
	for _, v := range videos {
		if v == nil || (excludeID != uuid.Nil && v.ID == excludeID) {
			continue
		}
		if normalizeFolder(v.Folder) == folder && strings.EqualFold(videoDisplayName(v), candidate) {
			return ErrVideoDuplicateName
		}
	}
	return nil
}

func (s *service) nextCopyName(ctx context.Context, name string, folder string) (string, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		name = "Untitled video"
	}
	if err := s.ensureUniqueVideoName(ctx, name, folder, uuid.Nil); err == nil {
		return name, nil
	} else if err != ErrVideoDuplicateName {
		return "", err
	}

	ext := filepath.Ext(name)
	base := strings.TrimSpace(strings.TrimSuffix(name, ext))
	if base == "" {
		base = "Untitled video"
	}
	for index := 1; index <= 1000; index += 1 {
		suffix := "copy"
		if index > 1 {
			suffix = fmt.Sprintf("copy %d", index)
		}
		candidate := fmt.Sprintf("%s (%s)%s", base, suffix, ext)
		if err := s.ensureUniqueVideoName(ctx, candidate, folder, uuid.Nil); err == nil {
			return candidate, nil
		} else if err != ErrVideoDuplicateName {
			return "", err
		}
	}
	return "", ErrVideoDuplicateName
}

func videoDisplayName(v *Video) string {
	name := strings.TrimSpace(v.OriginalName)
	if name != "" {
		return name
	}
	return strings.TrimSpace(v.Filename)
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
