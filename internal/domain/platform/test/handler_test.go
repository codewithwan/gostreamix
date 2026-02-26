package test

import (
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	authTest "github.com/codewithwan/gostreamix/internal/domain/auth/test"
	"github.com/codewithwan/gostreamix/internal/domain/platform"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.uber.org/zap"
)

func TestPlatformHandler(t *testing.T) {
	app := fiber.New()
	mockPlatformSvc := new(MockPlatformService)
	mockAuthSvc := new(authTest.MockAuthService)
	handler := platform.NewHandler(mockPlatformSvc, mockAuthSvc, zap.NewNop())

	// Mock middleware to set user_id
	userID := uuid.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("user_id", userID)
		return c.Next()
	})

	handler.Routes(app)
	ctx := mock.Anything

	t.Run("GET /api/platforms", func(t *testing.T) {
		user := &auth.User{ID: userID, Username: "admin"}
		mockAuthSvc.On("GetUserByID", ctx, userID).Return(user, nil)
		mockPlatformSvc.On("GetPlatforms", ctx, userID).Return([]*platform.Platform{}, nil)

		req := httptest.NewRequest("GET", "/api/platforms/", nil)
		resp, _ := app.Test(req, -1)

		assert.Equal(t, fiber.StatusOK, resp.StatusCode)
	})

	t.Run("POST /api/platforms", func(t *testing.T) {
		mockAuthSvc.On("GetUserByID", ctx, userID).Return(&auth.User{ID: userID}, nil)
		mockPlatformSvc.On("CreatePlatform", ctx, userID, mock.Anything).Return(&platform.Platform{}, nil)

		body := `{"name":"YouTube","platform_type":"youtube","stream_key":"abc123"}`
		req := httptest.NewRequest("POST", "/api/platforms/", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		resp, _ := app.Test(req, -1)

		assert.Equal(t, fiber.StatusCreated, resp.StatusCode)
	})
}
