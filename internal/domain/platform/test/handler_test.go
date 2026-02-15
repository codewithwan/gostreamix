package test

import (
	"net/http/httptest"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	authTest "github.com/codewithwan/gostreamix/internal/domain/auth/test"
	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestPlatformHandler(t *testing.T) {
	app := fiber.New()
	mockPlatformSvc := new(MockPlatformService)
	mockAuthSvc := new(authTest.MockAuthService)
	handler := platform.NewHandler(mockPlatformSvc, mockAuthSvc)

	// Mock middleware to set user_id
	userID := uuid.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("user_id", userID)
		return c.Next()
	})

	handler.Routes(app)
	ctx := mock.Anything

	t.Run("GET /platforms", func(t *testing.T) {
		user := &auth.User{ID: userID, Username: "admin"}
		mockAuthSvc.On("GetUserByID", ctx, userID).Return(user, nil)
		mockPlatformSvc.On("GetPlatforms", ctx, userID).Return([]*platform.Platform{}, nil)

		req := httptest.NewRequest("GET", "/platforms", nil)
		resp, _ := app.Test(req, -1)

		assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	})

	t.Run("GET /platforms/list", func(t *testing.T) {
		mockAuthSvc.On("GetUserByID", ctx, userID).Return(&auth.User{ID: userID}, nil)
		mockPlatformSvc.On("GetPlatforms", ctx, userID).Return([]*platform.Platform{}, nil)

		req := httptest.NewRequest("GET", "/platforms/list", nil)
		resp, _ := app.Test(req, -1)

		assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	})
}
