package test

import (
	"context"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestPlatformService_CreatePlatform(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	t.Run("Create success", func(t *testing.T) {
		mockRepo := new(MockPlatformRepository)
		service := platform.NewService(mockRepo)

		dto := platform.CreatePlatformDTO{
			Name:         "Twitch Admin",
			PlatformType: "twitch",
			StreamKey:    "live_123456_abcdef",
		}

		mockRepo.On("Create", ctx, mock.AnythingOfType("*platform.Platform")).Return(nil)

		p, err := service.CreatePlatform(ctx, userID, dto)
		assert.NoError(t, err)
		assert.NotNil(t, p)
		assert.Equal(t, dto.Name, p.Name)
		assert.Equal(t, dto.PlatformType, p.PlatformType)
		assert.Equal(t, userID, p.UserID)

		mockRepo.AssertExpectations(t)
	})
}

func TestPlatformService_GetPlatforms(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	t.Run("Get platforms success", func(t *testing.T) {
		mockRepo := new(MockPlatformRepository)
		service := platform.NewService(mockRepo)

		platforms := []*platform.Platform{
			{ID: uuid.New(), Name: "Twitch", UserID: userID},
			{ID: uuid.New(), Name: "YouTube", UserID: userID},
		}

		mockRepo.On("FindByUserID", ctx, userID).Return(platforms, nil)

		res, err := service.GetPlatforms(ctx, userID)
		assert.NoError(t, err)
		assert.Len(t, res, 2)
		assert.Equal(t, platforms[0].Name, res[0].Name)

		mockRepo.AssertExpectations(t)
	})
}

func TestPlatformService_UpdatePlatform(t *testing.T) {
	ctx := context.Background()
	platformID := uuid.New()
	userID := uuid.New()

	t.Run("Update success", func(t *testing.T) {
		mockRepo := new(MockPlatformRepository)
		service := platform.NewService(mockRepo)

		existingPlatform := &platform.Platform{
			ID:           platformID,
			Name:         "Old Name",
			PlatformType: "twitch",
			UserID:       userID,
		}

		dto := platform.UpdatePlatformDTO{
			Name:         "New Name",
			PlatformType: "twitch",
			StreamKey:    "new_key",
		}

		mockRepo.On("FindByID", ctx, platformID).Return(existingPlatform, nil)
		mockRepo.On("Update", ctx, mock.AnythingOfType("*platform.Platform")).Return(nil)

		p, err := service.UpdatePlatform(ctx, platformID, dto)
		assert.NoError(t, err)
		assert.NotNil(t, p)
		assert.Equal(t, "New Name", p.Name)
		assert.Equal(t, "new_key", p.StreamKey)

		mockRepo.AssertExpectations(t)
	})

	t.Run("Update failed - not found", func(t *testing.T) {
		mockRepo := new(MockPlatformRepository)
		service := platform.NewService(mockRepo)

		mockRepo.On("FindByID", ctx, platformID).Return(nil, platform.ErrPlatformNotFound)

		p, err := service.UpdatePlatform(ctx, platformID, platform.UpdatePlatformDTO{})
		assert.Error(t, err)
		assert.Nil(t, p)
		assert.Equal(t, platform.ErrPlatformNotFound, err)

		mockRepo.AssertExpectations(t)
	})
}

func TestPlatformService_DeletePlatform(t *testing.T) {
	ctx := context.Background()
	platformID := uuid.New()

	t.Run("Delete success", func(t *testing.T) {
		mockRepo := new(MockPlatformRepository)
		service := platform.NewService(mockRepo)

		mockRepo.On("Delete", ctx, platformID).Return(nil)

		err := service.DeletePlatform(ctx, platformID)
		assert.NoError(t, err)

		mockRepo.AssertExpectations(t)
	})
}
