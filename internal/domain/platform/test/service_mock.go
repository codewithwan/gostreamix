package test

import (
	"context"

	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

type MockPlatformService struct {
	mock.Mock
}

func (m *MockPlatformService) CreatePlatform(ctx context.Context, userID uuid.UUID, dto platform.CreatePlatformDTO) (*platform.Platform, error) {
	args := m.Called(ctx, userID, dto)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*platform.Platform), args.Error(1)
}

func (m *MockPlatformService) GetPlatforms(ctx context.Context, userID uuid.UUID) ([]*platform.Platform, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*platform.Platform), args.Error(1)
}

func (m *MockPlatformService) DeletePlatform(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockPlatformService) GetPlatform(ctx context.Context, id uuid.UUID) (*platform.Platform, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*platform.Platform), args.Error(1)
}

func (m *MockPlatformService) UpdatePlatform(ctx context.Context, id uuid.UUID, dto platform.UpdatePlatformDTO) (*platform.Platform, error) {
	args := m.Called(ctx, id, dto)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*platform.Platform), args.Error(1)
}
