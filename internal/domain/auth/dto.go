package auth

import "github.com/google/uuid"

type UserDTO struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
	Email    string    `json:"email"`
}

type LoginDTO struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type SetupDTO struct {
	Username        string `json:"username" validate:"required,min=3"`
	Email           string `json:"email" validate:"required,email"`
	Password        string `json:"password" validate:"required,min=8"`
	ConfirmPassword string `json:"confirm_password" validate:"required"`
}
