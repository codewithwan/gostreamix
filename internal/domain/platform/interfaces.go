package platform

import (
	"context"

	"github.com/google/uuid"
)

type Service interface {
	CreatePlatform(ctx context.Context, userID uuid.UUID, dto CreatePlatformDTO) (*Platform, error)
	GetPlatforms(ctx context.Context, userID uuid.UUID) ([]*Platform, error)
	DeletePlatform(ctx context.Context, id uuid.UUID) error
	GetPlatform(ctx context.Context, id uuid.UUID) (*Platform, error)
	UpdatePlatform(ctx context.Context, id uuid.UUID, dto UpdatePlatformDTO) (*Platform, error)
}

type Repository interface {
	Create(ctx context.Context, p *Platform) error
	Update(ctx context.Context, p *Platform) error
	Delete(ctx context.Context, id uuid.UUID) error
	FindByID(ctx context.Context, id uuid.UUID) (*Platform, error)
	FindByUserID(ctx context.Context, userID uuid.UUID) ([]*Platform, error)
}
