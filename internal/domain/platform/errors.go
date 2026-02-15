package platform

import "errors"

var (
	ErrPlatformNotFound = errors.New("platform not found")
	ErrInvalidPlatform  = errors.New("invalid platform data")
	ErrPlatformExists   = errors.New("platform already exists")
)
