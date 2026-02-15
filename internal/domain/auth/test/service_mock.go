package test

import (
	"context"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"
)

type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) Setup(ctx context.Context, username, email, password string) error {
	args := m.Called(ctx, username, email, password)
	return args.Error(0)
}

func (m *MockAuthService) Authenticate(ctx context.Context, username, password string) (*auth.User, error) {
	args := m.Called(ctx, username, password)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*auth.User), args.Error(1)
}

func (m *MockAuthService) GetUserByID(ctx context.Context, id uuid.UUID) (*auth.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*auth.User), args.Error(1)
}

func (m *MockAuthService) ResetPassword(ctx context.Context, username, password string) error {
	args := m.Called(ctx, username, password)
	return args.Error(0)
}

func (m *MockAuthService) GetPrimaryUser(ctx context.Context) (*auth.User, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*auth.User), args.Error(1)
}

func (m *MockAuthService) IsSetup(ctx context.Context) (bool, error) {
	args := m.Called(ctx)
	return args.Bool(0), args.Error(1)
}
