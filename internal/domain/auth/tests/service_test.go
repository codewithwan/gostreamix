package tests

import (
	"context"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/google/uuid"
)

type mockRepo struct{}

func (m *mockRepo) CountUsers(ctx context.Context) (int, error)        { return 1, nil }
func (m *mockRepo) CreateUser(ctx context.Context, u *auth.User) error { return nil }
func (m *mockRepo) GetUserByUsername(ctx context.Context, u string) (*auth.User, error) {
	return &auth.User{Username: u}, nil
}
func (m *mockRepo) GetUserByID(ctx context.Context, id uuid.UUID) (*auth.User, error) {
	return &auth.User{ID: id}, nil
}
func (m *mockRepo) UpdatePassword(ctx context.Context, u, h string) error { return nil }
func (m *mockRepo) GetAnyUser(ctx context.Context) (*auth.User, error)    { return &auth.User{}, nil }

func TestIsSetup(t *testing.T) {
	s := auth.NewService(&mockRepo{})
	is, _ := s.IsSetup(context.Background())
	if !is {
		t.Errorf("expected true, got false")
	}
}
