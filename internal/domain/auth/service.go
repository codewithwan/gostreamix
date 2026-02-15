package auth

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) IsSetup(ctx context.Context) (bool, error) {
	c, err := s.repo.CountUsers(ctx)
	if err != nil {
		return false, fmt.Errorf("count users: %w", err)
	}
	return c > 0, nil
}

func (s *service) Setup(ctx context.Context, u, e, p string) error {
	is, _ := s.IsSetup(ctx)
	if is {
		return ErrAlreadySetup
	}
	h, err := bcrypt.GenerateFromPassword([]byte(p), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("generate password hash: %w", err)
	}
	if err := s.repo.CreateUser(ctx, &User{ID: uuid.New(), Username: u, Email: e, PasswordHash: string(h)}); err != nil {
		return fmt.Errorf("create user: %w", err)
	}
	return nil
}

func (s *service) Authenticate(ctx context.Context, u, p string) (*User, error) {
	usr, err := s.repo.GetUserByUsername(ctx, u)
	if err != nil {
		return nil, fmt.Errorf("get user by username: %w", err)
	}
	err = bcrypt.CompareHashAndPassword([]byte(usr.PasswordHash), []byte(p))
	if err != nil {
		return nil, ErrInvalidCredentials
	}
	return usr, nil
}

func (s *service) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	usr, err := s.repo.GetUserByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return usr, nil
}

func (s *service) ResetPassword(ctx context.Context, username, password string) error {
	h, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("generate password hash: %w", err)
	}
	if err := s.repo.UpdatePassword(ctx, username, string(h)); err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return nil
}

func (s *service) GetPrimaryUser(ctx context.Context) (*User, error) {
	usr, err := s.repo.GetAnyUser(ctx)
	if err != nil {
		return nil, fmt.Errorf("get primary user: %w", err)
	}
	return usr, nil
}
