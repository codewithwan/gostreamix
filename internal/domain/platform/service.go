package platform

import (
	"context"

	"github.com/google/uuid"
)

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreatePlatform(ctx context.Context, userID uuid.UUID, dto CreatePlatformDTO) (*Platform, error) {
	p := &Platform{
		ID:           uuid.New(),
		UserID:       userID,
		Name:         dto.Name,
		PlatformType: dto.PlatformType,
		StreamKey:    dto.StreamKey,
		CustomURL:    dto.CustomURL,
		Enabled:      true,
	}
	if err := s.repo.Create(ctx, p); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *service) GetPlatforms(ctx context.Context, userID uuid.UUID) ([]*Platform, error) {
	return s.repo.FindByUserID(ctx, userID)
}

func (s *service) DeletePlatform(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

func (s *service) GetPlatform(ctx context.Context, id uuid.UUID) (*Platform, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *service) UpdatePlatform(ctx context.Context, id uuid.UUID, dto UpdatePlatformDTO) (*Platform, error) {
	p, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	p.Name = dto.Name
	p.PlatformType = dto.PlatformType
	p.StreamKey = dto.StreamKey
	p.CustomURL = dto.CustomURL

	if err := s.repo.Update(ctx, p); err != nil {
		return nil, err
	}

	return p, nil
}
