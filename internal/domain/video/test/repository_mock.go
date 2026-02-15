package test

import (
	"context"

	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

type MockVideoRepository struct {
	mock.Mock
}

func (m *MockVideoRepository) Create(ctx context.Context, v *video.Video) error {
	args := m.Called(ctx, v)
	return args.Error(0)
}

func (m *MockVideoRepository) GetByID(ctx context.Context, id uuid.UUID) (*video.Video, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*video.Video), args.Error(1)
}

func (m *MockVideoRepository) List(ctx context.Context) ([]*video.Video, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*video.Video), args.Error(1)
}

func (m *MockVideoRepository) Delete(ctx context.Context, id uuid.UUID) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}
