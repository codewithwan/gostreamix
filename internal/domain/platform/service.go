package platform

import (
	"context"
	"fmt"
	"strings"

	sharedutils "github.com/codewithwan/gostreamix/internal/shared/utils"
	"github.com/google/uuid"
)

type service struct {
	repo Repository
}

const defaultPlatformColor = "#1f2937"

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreatePlatform(ctx context.Context, userID uuid.UUID, dto CreatePlatformDTO) (*Platform, error) {
	p := &Platform{
		ID:           uuid.New(),
		UserID:       userID,
		Name:         sharedutils.SanitizeStrict(dto.Name),
		PlatformType: dto.PlatformType,
		StreamKey:    dto.StreamKey,
		CustomURL:    dto.CustomURL,
		Color:        normalizePlatformColor(dto.PlatformType),
		Enabled:      true,
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, fmt.Errorf("create platform: %w", err)
	}
	return p, nil
}

func (s *service) GetPlatforms(ctx context.Context, userID uuid.UUID) ([]*Platform, error) {
	platforms, err := s.repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get platforms by user id: %w", err)
	}
	return platforms, nil
}

func (s *service) DeletePlatform(ctx context.Context, id uuid.UUID) error {
	if err := s.repo.Delete(ctx, id); err != nil {
		return fmt.Errorf("delete platform: %w", err)
	}
	return nil
}

func (s *service) GetPlatform(ctx context.Context, id uuid.UUID) (*Platform, error) {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get platform by id: %w", err)
	}
	return p, nil
}

func (s *service) UpdatePlatform(ctx context.Context, id uuid.UUID, dto UpdatePlatformDTO) (*Platform, error) {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("update platform - find by id: %w", err)
	}

	p.Name = sharedutils.SanitizeStrict(dto.Name)
	p.PlatformType = dto.PlatformType
	p.StreamKey = dto.StreamKey
	p.CustomURL = dto.CustomURL
	p.Color = normalizePlatformColor(dto.PlatformType)

	if err := s.repo.Update(ctx, p); err != nil {
		return nil, fmt.Errorf("update platform: %w", err)
	}

	return p, nil
}

func normalizePlatformColor(platformType string) string {
	switch strings.ToLower(strings.TrimSpace(platformType)) {
	case "youtube":
		return "#ff0033"
	case "twitch":
		return "#8b5cf6"
	case "facebook":
		return "#1877f2"
	case "tiktok":
		return "#111111"
	default:
		return defaultPlatformColor
	}
}
