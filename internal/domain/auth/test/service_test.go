package test

import (
	"context"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
)

func TestAuthService_Setup(t *testing.T) {
	ctx := context.Background()

	t.Run("Setup success", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo)

		mockRepo.On("CountUsers", ctx).Return(0, nil)
		mockRepo.On("CreateUser", ctx, mock.AnythingOfType("*auth.User")).Return(nil)

		err := service.Setup(ctx, "admin", "admin@example.com", "password")
		assert.NoError(t, err)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Setup failed - already setup", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo)

		mockRepo.On("CountUsers", ctx).Return(1, nil)

		err := service.Setup(ctx, "admin", "admin@example.com", "password")
		assert.Error(t, err)
		assert.Equal(t, auth.ErrAlreadySetup, err)
		mockRepo.AssertExpectations(t)
	})
}

func TestAuthService_Authenticate(t *testing.T) {
	ctx := context.Background()
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("password"), bcrypt.DefaultCost)
	user := &auth.User{
		ID:           uuid.New(),
		Username:     "admin",
		PasswordHash: string(hashedPassword),
	}

	t.Run("Authenticate success", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo)

		mockRepo.On("GetUserByUsername", ctx, "admin").Return(user, nil)

		res, err := service.Authenticate(ctx, "admin", "password")
		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Equal(t, user.ID, res.ID)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Authenticate failed - invalid password", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo)

		mockRepo.On("GetUserByUsername", ctx, "admin").Return(user, nil)

		res, err := service.Authenticate(ctx, "admin", "wrongpassword")
		assert.Error(t, err)
		assert.Equal(t, auth.ErrInvalidCredentials, err)
		assert.Nil(t, res)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Authenticate failed - user not found", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo)

		mockRepo.On("GetUserByUsername", ctx, "unknown").Return(nil, auth.ErrUserNotFound)

		res, err := service.Authenticate(ctx, "unknown", "password")
		assert.Error(t, err)
		assert.Equal(t, auth.ErrUserNotFound, err)
		assert.Nil(t, res)
		mockRepo.AssertExpectations(t)
	})
}
