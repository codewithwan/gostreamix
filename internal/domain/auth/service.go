package auth

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/codewithwan/gostreamix/internal/shared/jwt"
	"github.com/codewithwan/gostreamix/internal/shared/utils"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type loginAttempt struct {
	Attempts int
	LockedAt time.Time
}

var loginAttempts = sync.Map{}

type service struct {
	repo Repository
	jwt  *jwt.JWTService
}

func NewService(repo Repository, jwt *jwt.JWTService) Service {
	return &service{repo: repo, jwt: jwt}
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

var dummyHash []byte

func init() {
	dummyHash = []byte("$2a$10$dummy.hash.for.timing.protection.so.computation.takes.time")
}

func (s *service) Authenticate(ctx context.Context, u, p string) (*User, error) {
	if s.isAccountLocked(u) {
		return nil, errors.New("account locked due to too many failed attempts")
	}

	usr, err := s.repo.GetUserByUsername(ctx, u)
	if err != nil {
		s.recordFailedAttempt(u)
		// compute bcrypt for timing protection
		bcrypt.CompareHashAndPassword(dummyHash, []byte(p))
		return nil, ErrInvalidCredentials
	}

	err = bcrypt.CompareHashAndPassword([]byte(usr.PasswordHash), []byte(p))
	if err != nil {
		s.recordFailedAttempt(u)
		return nil, ErrInvalidCredentials
	}

	s.clearFailedAttempts(u)
	return usr, nil
}

func (s *service) isAccountLocked(u string) bool {
	if val, ok := loginAttempts.Load(u); ok {
		attempt := val.(*loginAttempt)
		if attempt.Attempts >= 5 {
			if time.Since(attempt.LockedAt) < 15*time.Minute {
				return true
			}
			// reset after lockout expires
			s.clearFailedAttempts(u)
		}
	}
	return false
}

func (s *service) recordFailedAttempt(u string) {
	val, _ := loginAttempts.LoadOrStore(u, &loginAttempt{})
	attempt := val.(*loginAttempt)
	attempt.Attempts++
	if attempt.Attempts >= 5 {
		attempt.LockedAt = time.Now()
	}
}

func (s *service) clearFailedAttempts(u string) {
	loginAttempts.Delete(u)
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

func (s *service) CreateSession(ctx context.Context, userID uuid.UUID, ip, userAgent string) (string, string, error) {
	at, err := s.jwt.GenerateAccessToken(userID)
	if err != nil {
		return "", "", fmt.Errorf("generate access token: %w", err)
	}

	rt, err := s.jwt.GenerateRefreshToken(userID)
	if err != nil {
		return "", "", fmt.Errorf("generate refresh token: %w", err)
	}

	_, exp, err := s.jwt.GetRefreshTokenClaims(rt)
	if err != nil {
		return "", "", fmt.Errorf("parse refresh token: %w", err)
	}

	hash := utils.HashToken(rt)
	refreshToken := &RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: hash,
		ExpiresAt: time.Unix(exp, 0),
		IPAddress: ip,
		UserAgent: userAgent,
	}

	if err := s.repo.SaveRefreshToken(ctx, refreshToken); err != nil {
		return "", "", fmt.Errorf("save refresh token: %w", err)
	}
	return at, rt, nil
}

func (s *service) RefreshSession(ctx context.Context, token, ip, userAgent string) (string, string, error) {
	uID, _, err := s.jwt.GetRefreshTokenClaims(token)
	if err != nil {
		return "", "", fmt.Errorf("invalid refresh token: %w", err)
	}

	hash := utils.HashToken(token)
	rtModel, err := s.repo.GetRefreshToken(ctx, hash)
	if err != nil {
		return "", "", fmt.Errorf("refresh token not found: %w", err)
	}

	if rtModel.Revoked {
		return "", "", fmt.Errorf("token revoked")
	}

	if err := s.repo.RevokeRefreshToken(ctx, hash); err != nil {
		return "", "", fmt.Errorf("revoke old token: %w", err)
	}

	return s.CreateSession(ctx, uID, ip, userAgent)
}

func (s *service) RevokeSession(ctx context.Context, token string) error {
	hash := utils.HashToken(token)
	return s.repo.RevokeRefreshToken(ctx, hash)
}

func (s *service) RevokeAllSessions(ctx context.Context, userID uuid.UUID) error {
	return s.repo.RevokeAllRefreshTokens(ctx, userID)
}
