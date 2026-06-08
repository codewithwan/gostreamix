package video

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

func (s *service) ProcessVideo(ctx context.Context, dto ProcessVideoDTO) (*Video, error) {
	folder := normalizeFolder(dto.Folder)
	originalName := strings.TrimSpace(dto.OriginalName)
	if originalName == "" {
		originalName = dto.Filename
	}
	if err := s.ensureUniqueVideoName(ctx, originalName, folder, uuid.Nil); err != nil {
		return nil, err
	}

	meta := dto.Metadata
	if meta == nil {
		var err error
		meta, err = ProbeVideo(dto.Path)
		if err != nil {
			return nil, fmt.Errorf("probe video: %w", err)
		}
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
