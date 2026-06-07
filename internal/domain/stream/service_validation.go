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

func (s *service) validateProgram(ctx context.Context, videoIDs []uuid.UUID, targets []string, bitrate int, resolution string, fps int) ([]string, []string, error) {
	if len(videoIDs) == 0 {
		return nil, nil, ErrStreamProgramEmpty
	}
	videoPaths, err := s.videoPaths(ctx, videoIDs)
	if err != nil {
		return nil, nil, err
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

func (s *service) videoPaths(ctx context.Context, videoIDs []uuid.UUID) ([]string, error) {
	videoPaths := make([]string, 0, len(videoIDs))
	for _, id := range videoIDs {
		videoPath, err := s.videoPath(ctx, id)
		if err != nil {
			return nil, err
		}
		videoPaths = append(videoPaths, videoPath)
	}
	return videoPaths, nil
}

func (s *service) videoPath(ctx context.Context, id uuid.UUID) (string, error) {
	if id == uuid.Nil {
		return "", fmt.Errorf("program contains an empty video id")
	}
	videoData, err := s.videoRepo.GetByID(ctx, id)
	if err != nil {
		return "", fmt.Errorf("video %s was not found: %w", id.String(), err)
	}
	if videoData == nil || strings.TrimSpace(videoData.Filename) == "" {
		return "", fmt.Errorf("video %s is invalid", id.String())
	}
	videoPath := filepath.Join("data", "uploads", videoData.Filename)
	if _, err := os.Stat(videoPath); err != nil {
		return "", fmt.Errorf("source file for %s is missing: %w", videoDisplayName(videoData), err)
	}
	return videoPath, nil
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
