package test

import (
	"context"

	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

type MockPlatformRepository struct {
	mock.Mock
}

func (m *MockPlatformRepository) Create(ctx context.Context, p *platform.Platform) error {
	args := m.Called(ctx, p)
	return args.Error(0)
}

func (m *MockPlatformRepository) Update(ctx context.Context, p *platform.Platform) error {
	args := m.Called(ctx, p)
	return args.Error(0)
}

func (m *MockPlatformRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockPlatformRepository) FindByID(ctx context.Context, id uuid.UUID) (*platform.Platform, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*platform.Platform), args.Error(1)
}

func (m *MockPlatformRepository) FindByUserID(ctx context.Context, userID uuid.UUID) ([]*platform.Platform, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*platform.Platform), args.Error(1)
}
