package jwt

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type JWTService struct {
	secret string
}

func NewJWTService(cfg struct{ Secret string }) *JWTService {
	return &JWTService{secret: cfg.Secret}
}

func (s *JWTService) GenerateToken(userID uuid.UUID) (string, error) {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": userID.String(),
		"exp": time.Now().Add(time.Hour * 72).Unix(),
	})
	return t.SignedString([]byte(s.secret))
}

func (s *JWTService) ValidateToken(token string) (*jwt.Token, error) {
	return jwt.Parse(token, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid token")
		}
		return []byte(s.secret), nil
	})
}

func (s *JWTService) GetUserID(token string) uuid.UUID {
	t, err := s.ValidateToken(token)
	if err != nil || !t.Valid {
		return uuid.Nil
	}
	claims, ok := t.Claims.(jwt.MapClaims)
	if !ok {
		return uuid.Nil
	}
	idStr, ok := claims["sub"].(string)
	if !ok {
		return uuid.Nil
	}
	id, err := uuid.Parse(idStr)
	if err != nil {
		return uuid.Nil
	}
	return id
}
