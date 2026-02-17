package test

import (
	"context"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

type MockAuthRepository struct {
	mock.Mock
}

func (m *MockAuthRepository) CountUsers(ctx context.Context) (int, error) {
	args := m.Called(ctx)
	return args.Int(0), args.Error(1)
}

func (m *MockAuthRepository) CreateUser(ctx context.Context, u *auth.User) error {
	args := m.Called(ctx, u)
	return args.Error(0)
}

func (m *MockAuthRepository) GetUserByUsername(ctx context.Context, u string) (*auth.User, error) {
	args := m.Called(ctx, u)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*auth.User), args.Error(1)
}

func (m *MockAuthRepository) GetUserByID(ctx context.Context, id uuid.UUID) (*auth.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*auth.User), args.Error(1)
}

func (m *MockAuthRepository) UpdatePassword(ctx context.Context, username, hash string) error {
	args := m.Called(ctx, username, hash)
	return args.Error(0)
}

func (m *MockAuthRepository) GetAnyUser(ctx context.Context) (*auth.User, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*auth.User), args.Error(1)
}

func (m *MockAuthRepository) SaveRefreshToken(ctx context.Context, rt *auth.RefreshToken) error {
	args := m.Called(ctx, rt)
	return args.Error(0)
}

func (m *MockAuthRepository) GetRefreshToken(ctx context.Context, hash string) (*auth.RefreshToken, error) {
	args := m.Called(ctx, hash)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*auth.RefreshToken), args.Error(1)
}

func (m *MockAuthRepository) RevokeRefreshToken(ctx context.Context, hash string) error {
	args := m.Called(ctx, hash)
	return args.Error(0)
}

func (m *MockAuthRepository) RevokeAllRefreshTokens(ctx context.Context, userID uuid.UUID) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}
