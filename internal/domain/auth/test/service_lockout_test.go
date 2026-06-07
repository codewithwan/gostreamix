package test

import (
	"context"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/stretchr/testify/assert"
)

func TestAuthService_AccountLockout(t *testing.T) {
	ctx := context.Background()

	t.Run("Lockout after 5 attempts", func(t *testing.T) {
		mockRepo := new(MockAuthRepository)
		service := auth.NewService(mockRepo, testJWT)
		username := "locked_user"

		mockRepo.On("GetUserByUsername", ctx, username).Return(nil, auth.ErrUserNotFound)

		for i := 0; i < 5; i++ {
			_, err := service.Authenticate(ctx, username, "wrong")
			assert.Equal(t, auth.ErrInvalidCredentials, err)
		}

		_, err := service.Authenticate(ctx, username, "any")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "account locked")

		mockRepo.AssertExpectations(t)
	})
}
