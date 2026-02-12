package auth

import "errors"

var (
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrAlreadySetup       = errors.New("system already setup")
	ErrPasswordMismatch   = errors.New("passwords do not match")
)
