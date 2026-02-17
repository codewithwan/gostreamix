package test

import (
	"context"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/shared/jwt"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"golang.org/x/crypto/bcrypt"
)

var testJWT = jwt.NewJWTService(struct{ Secret string }{Secret: "secret"})

func TestAuthService_Setup(t *testing.T) {
	ctx := context.Background()

	t.Run("Setup success", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo, testJWT)

		mockRepo.On("CountUsers", ctx).Return(0, nil)
		mockRepo.On("CreateUser", ctx, mock.AnythingOfType("*auth.User")).Return(nil)

		err := service.Setup(ctx, "admin", "admin@example.com", "password")
		assert.NoError(t, err)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Setup failed - already setup", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo, testJWT)

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
		service := auth.NewService(mockRepo, testJWT)

		mockRepo.On("GetUserByUsername", ctx, "admin").Return(user, nil)

		res, err := service.Authenticate(ctx, "admin", "password")
		assert.NoError(t, err)
		assert.NotNil(t, res)
		assert.Equal(t, user.ID, res.ID)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Authenticate failed - invalid password", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo, testJWT)

		mockRepo.On("GetUserByUsername", ctx, "admin").Return(user, nil)

		res, err := service.Authenticate(ctx, "admin", "wrongpassword")
		assert.Error(t, err)
		assert.Equal(t, auth.ErrInvalidCredentials, err)
		assert.Nil(t, res)
		mockRepo.AssertExpectations(t)
	})

	t.Run("Authenticate failed - user not found", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo, testJWT)

		mockRepo.On("GetUserByUsername", ctx, "unknown").Return(nil, auth.ErrUserNotFound)

		res, err := service.Authenticate(ctx, "unknown", "password")
		assert.Error(t, err)
		assert.Nil(t, res)
		mockRepo.AssertExpectations(t)
	})
}

func TestAuthService_GetUserByID(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	user := &auth.User{ID: userID, Username: "admin"}

	t.Run("Success", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo, testJWT)

		mockRepo.On("GetUserByID", ctx, userID).Return(user, nil)

		res, err := service.GetUserByID(ctx, userID)
		assert.NoError(t, err)
		assert.Equal(t, user, res)
	})
}

func TestAuthService_ResetPassword(t *testing.T) {
	ctx := context.Background()

	t.Run("Success", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo, testJWT)

		mockRepo.On("UpdatePassword", ctx, "admin", mock.AnythingOfType("string")).Return(nil)

		err := service.ResetPassword(ctx, "admin", "newpassword")
		assert.NoError(t, err)
	})
}

func TestAuthService_GetPrimaryUser(t *testing.T) {
	ctx := context.Background()
	user := &auth.User{ID: uuid.New(), Username: "admin"}

	t.Run("Success", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo, testJWT)

		mockRepo.On("GetAnyUser", ctx).Return(user, nil)

		res, err := service.GetPrimaryUser(ctx)
		assert.NoError(t, err)
		assert.Equal(t, user, res)
	})
}
func TestAuthService_CreateSession(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	t.Run("Success", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo, testJWT)

		mockRepo.On("SaveRefreshToken", ctx, mock.AnythingOfType("*auth.RefreshToken")).Return(nil)

		at, rt, err := service.CreateSession(ctx, userID, "127.0.0.1", "test-agent")
		assert.NoError(t, err)
		assert.NotEmpty(t, at)
		assert.NotEmpty(t, rt)
		mockRepo.AssertExpectations(t)
	})
}

func TestAuthService_RefreshSession(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()
	token, _ := testJWT.GenerateRefreshToken(userID)

	t.Run("Success", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo, testJWT)

		rtModel := &auth.RefreshToken{UserID: userID, Revoked: false}
		mockRepo.On("GetRefreshToken", ctx, mock.AnythingOfType("string")).Return(rtModel, nil)
		mockRepo.On("RevokeRefreshToken", ctx, mock.AnythingOfType("string")).Return(nil)
		mockRepo.On("SaveRefreshToken", ctx, mock.AnythingOfType("*auth.RefreshToken")).Return(nil)

		at, rt, err := service.RefreshSession(ctx, token, "127.0.0.1", "test-agent")
		assert.NoError(t, err)
		assert.NotEmpty(t, at)
		assert.NotEmpty(t, rt)
		mockRepo.AssertExpectations(t)
	})
}

func TestAuthService_RevokeSession(t *testing.T) {
	ctx := context.Background()

	t.Run("Success", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo, testJWT)

		mockRepo.On("RevokeRefreshToken", ctx, mock.AnythingOfType("string")).Return(nil)

		err := service.RevokeSession(ctx, "token")
		assert.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})
}

func TestAuthService_AccountLockout(t *testing.T) {
	ctx := context.Background()

	t.Run("Lockout after 5 attempts", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo, testJWT)
		username := "locked_user"

		mockRepo.On("GetUserByUsername", ctx, username).Return(nil, auth.ErrUserNotFound)

		// 5 failed attempts
		for i := 0; i < 5; i++ {
			_, err := service.Authenticate(ctx, username, "wrong")
			assert.Equal(t, auth.ErrInvalidCredentials, err)
		}

		// 6th attempt should be locked
		_, err := service.Authenticate(ctx, username, "any")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "account locked")

		mockRepo.AssertExpectations(t)
	})
}
