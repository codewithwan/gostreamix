package video

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

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
