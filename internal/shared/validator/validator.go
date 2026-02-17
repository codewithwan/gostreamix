package validator

import (
	"errors"
	"regexp"
	"strings"

	govalidator "github.com/go-playground/validator/v10"
)

var validate = govalidator.New()

func init() {
	_ = validate.RegisterValidation("password", func(fl govalidator.FieldLevel) bool {
		p := fl.Field().String()
		if len(p) < 8 {
			return false
		}
		hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(p)
		hasLower := regexp.MustCompile(`[a-z]`).MatchString(p)
		hasNumber := regexp.MustCompile(`[0-9]`).MatchString(p)
		return hasUpper && hasLower && hasNumber
	})
}

func Password(p string) error {
	err := validate.Var(p, "required,min=8,password")
	if err != nil {
		if strings.Contains(err.Error(), "password") {
			return errors.New("password must contain uppercase, lowercase, and number")
		}
		return errors.New("password must be at least 8 characters")
	}
	return nil
}

func Email(e string) error {
	err := validate.Var(e, "required,email")
	if err != nil {
		return errors.New("invalid email format")
	}
	return nil
}

func Username(u string) error {
	err := validate.Var(u, "required,min=3,alphanum")
	if err != nil {
		return errors.New("username must be at least 3 characters and alphanumeric")
	}
	usernameRegex := regexp.MustCompile(`^[a-zA-Z0-9._\-]+$`)
	if !usernameRegex.MatchString(u) {
		return errors.New("username can only contain alphanumeric characters, dots, underscores, and hyphens")
	}
	return nil
}

func SanitizeInput(s string) string {
	return regexp.MustCompile(`[<>"{}]`).ReplaceAllString(strings.TrimSpace(s), "")
}
