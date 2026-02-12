package auth

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) IsSetup(ctx context.Context) (bool, error) {
	c, err := s.repo.CountUsers(ctx)
	return c > 0, err
}

func (s *Service) Setup(ctx context.Context, u, e, p string) error {
	is, _ := s.IsSetup(ctx)
	if is {
		return errors.New("already setup")
	}
	h, err := bcrypt.GenerateFromPassword([]byte(p), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.repo.CreateUser(ctx, &User{ID: uuid.New(), Username: u, Email: e, PasswordHash: string(h)})
}

func (s *Service) Authenticate(ctx context.Context, u, p string) (*User, error) {
	usr, err := s.repo.GetUserByUsername(ctx, u)
	if err != nil {
		return nil, err
	}
	err = bcrypt.CompareHashAndPassword([]byte(usr.PasswordHash), []byte(p))
	return usr, err
}

func (s *Service) GetUserByID(ctx context.Context, id uuid.UUID) (*User, error) {
	return s.repo.GetUserByID(ctx, id)
}

func (s *Service) ResetPassword(ctx context.Context, username, password string) error {
	h, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.repo.UpdatePassword(ctx, username, string(h))
}

func (s *Service) GetPrimaryUser(ctx context.Context) (*User, error) {
	return s.repo.GetAnyUser(ctx)
}
