package errors

import "errors"

var (
	ErrInternalServer = errors.New("internal server error")
	ErrUnauthorized   = errors.New("unauthorized")
	ErrForbidden      = errors.New("forbidden")
	ErrBadRequest     = errors.New("bad request")
)
