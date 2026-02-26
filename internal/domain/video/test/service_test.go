package test

import (
	"context"
	"errors"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/video"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
)

func TestVideoService_GetVideos(t *testing.T) {
	mockVideos := []*video.Video{
		{ID: uuid.New(), Filename: "vid1.mp4"},
		{ID: uuid.New(), Filename: "vid2.mp4"},
	}

	t.Run("GetVideos success", func(t *testing.T) {
		mockRepo := new(MockVideoRepository)
		service := video.NewService(mockRepo)
		ctx := context.Background()

		mockRepo.On("List", ctx).Return(mockVideos, nil)

		res, err := service.GetVideos(ctx)
		assert.NoError(t, err)
		assert.Equal(t, len(mockVideos), len(res))
		mockRepo.AssertExpectations(t)
	})
}

func TestVideoService_DeleteVideo(t *testing.T) {
	ctx := context.Background()
	vidID := uuid.New()
	mockVideo := &video.Video{
		ID:        vidID,
		Filename:  "test.mp4",
		Thumbnail: "test.jpg",
	}

	t.Run("DeleteVideo success", func(t *testing.T) {
		mockRepo := new(MockVideoRepository)
		service := video.NewService(mockRepo)

		mockRepo.On("GetByID", ctx, vidID).Return(mockVideo, nil)
		mockRepo.On("Delete", ctx, vidID).Return(nil)

		// Note: This test will attempt to remove files, which might fail if they don't exist.
		// For a pure unit test, we should mock the os operations or ensure the service
		// handles file removal errors gracefully (which it currently ignores with _ =).
		err := service.DeleteVideo(ctx, vidID)
		assert.NoError(t, err)
		mockRepo.AssertExpectations(t)
	})

	t.Run("DeleteVideo failed - not found", func(t *testing.T) {
		mockRepo := new(MockVideoRepository)
		service := video.NewService(mockRepo)

		mockRepo.On("GetByID", ctx, vidID).Return(nil, video.ErrVideoNotFound)

		err := service.DeleteVideo(ctx, vidID)
		assert.Error(t, err)
		assert.True(t, errors.Is(err, video.ErrVideoNotFound))
		mockRepo.AssertExpectations(t)
	})
}
