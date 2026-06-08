package test

import (
	"net/http/httptest"
	"testing"

	authTest "github.com/codewithwan/gostreamix/internal/domain/auth/test"
	"github.com/codewithwan/gostreamix/internal/shared/jwt"
	"github.com/codewithwan/gostreamix/internal/shared/middleware"
	"github.com/gofiber/fiber/v2"
)

func TestThumbnailsRemainPublic(t *testing.T) {
	app := fiber.New()
	guard := middleware.NewAuthGuard(new(authTest.MockAuthService), jwt.NewJWTService(struct{ Secret string }{Secret: "test-secret"}))
	app.Use(guard.RequireAuth)
	app.Get("/thumbnails/example.jpg", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusNoContent) })

	req := httptest.NewRequest("GET", "/thumbnails/example.jpg", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusNoContent {
		t.Fatalf("expected thumbnails to remain public, got %d", resp.StatusCode)
	}
}
