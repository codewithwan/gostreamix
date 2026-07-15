package auth

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// ChangePassword verifies the user's current password before replacing it with
// a new bcrypt hash. It returns ErrInvalidCredentials when the current password
// does not match, so callers can respond without leaking which field was wrong.
func (s *service) ChangePassword(ctx context.Context, userID uuid.UUID, currentPassword, newPassword string) error {
	usr, err := s.repo.GetUserByID(ctx, userID)
	if err != nil || usr == nil {
		return ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(usr.PasswordHash), []byte(currentPassword)); err != nil {
		return ErrInvalidCredentials
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("generate password hash: %w", err)
	}

	if err := s.repo.UpdatePassword(ctx, usr.Username, string(hash)); err != nil {
		return fmt.Errorf("update password: %w", err)
	}

	return nil
}
