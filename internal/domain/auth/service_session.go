package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/codewithwan/gostreamix/internal/shared/utils"
	"github.com/google/uuid"
)

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

	refreshToken := &RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: utils.HashToken(rt),
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
	return s.repo.RevokeRefreshToken(ctx, utils.HashToken(token))
}

func (s *service) RevokeAllSessions(ctx context.Context, userID uuid.UUID) error {
	return s.repo.RevokeAllRefreshTokens(ctx, userID)
}
