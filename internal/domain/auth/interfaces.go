package auth

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type Repository interface {
	CountUsers(ctx context.Context) (int, error)
	CreateUser(ctx context.Context, u *User) error
	GetUserByUsername(ctx context.Context, u string) (*User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*User, error)
	UpdatePassword(ctx context.Context, username, hash string) error
	GetAnyUser(ctx context.Context) (*User, error)
}

type Service interface {
	IsSetup(ctx context.Context) (bool, error)
	Setup(ctx context.Context, u, e, p string) error
	Authenticate(ctx context.Context, u, p string) (*User, error)
	GetUserByID(ctx context.Context, id uuid.UUID) (*User, error)
	ResetPassword(ctx context.Context, username, password string) error
	GetPrimaryUser(ctx context.Context) (*User, error)
}

type Guard interface {
	RequireSetup(c *fiber.Ctx) error
	RequireAuth(c *fiber.Ctx) error
	GuestOnly(c *fiber.Ctx) error
}
