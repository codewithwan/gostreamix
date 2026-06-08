package test

import (
	"net/http/httptest"
	"testing"

	authTest "github.com/codewithwan/gostreamix/internal/domain/auth/test"
	"github.com/codewithwan/gostreamix/internal/shared/jwt"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/gofiber/fiber/v2"
)

func TestUploadAndWebSocketPathsRequireAuth(t *testing.T) {
	app := fiber.New()
	guard := middleware.NewAuthGuard(new(authTest.MockAuthService), jwt.NewJWTService(struct{ Secret string }{Secret: "test-secret"}))
	app.Use(guard.RequireAuth)
	app.Get("/uploads/example.mp4", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusNoContent) })
	app.Get("/ws", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusNoContent) })

	for _, path := range []string{"/uploads/example.mp4", "/ws"} {
		req := httptest.NewRequest("GET", path, nil)
		resp, err := app.Test(req, -1)
		if err != nil {
			t.Fatal(err)
		}
		if resp.StatusCode != fiber.StatusFound {
			t.Fatalf("expected %s to redirect to login without auth, got %d", path, resp.StatusCode)
		}
	}
}
