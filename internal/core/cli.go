package core

import (
	"context"
	"flag"
	"fmt"
	"os"
	"syscall"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/infrastructure/config"
	"github.com/codewithwan/gostreamix/internal/infrastructure/database"
	"github.com/codewithwan/gostreamix/internal/infrastructure/logger"
	"github.com/codewithwan/gostreamix/internal/shared/jwt"
	"github.com/codewithwan/gostreamix/internal/shared/validator"
	"golang.org/x/term"
)

// RunCLI parses maintenance flags. When one is requested (e.g. --reset-password)
// it runs the command and returns true so main() exits without starting the HTTP
// server. It returns false for a normal boot. Folding this into the primary
// binary means password resets work in the production image, which does not ship
// a separate CLI binary.
func RunCLI() bool {
	reset := flag.Bool("reset-password", false, "Reset the primary user password and exit")
	setPwd := flag.String("set-password", "", "Non-interactive password value for --reset-password")
	flag.Parse()

	if !*reset {
		return false
	}

	if err := resetPassword(*setPwd); err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}
	return true
}

func resetPassword(setPwd string) error {
	cfg := config.NewConfig()
	log, err := logger.NewLogger()
	if err != nil {
		return err
	}

	db, err := database.NewSQLiteDB(cfg, log)
	if err != nil {
		return err
	}

	repo := auth.NewRepository(db)
	jwtSvc := jwt.NewJWTService(struct{ Secret string }{Secret: cfg.Secret})
	svc := auth.NewService(repo, jwtSvc)

	user, err := svc.GetPrimaryUser(context.Background())
	if err != nil {
		return fmt.Errorf("no user found; run the initial setup first")
	}
	fmt.Printf("Resetting password for user: %s\n", user.Username)

	password := setPwd
	if password == "" {
		fmt.Print("Enter New Password: ")
		bytePassword, _ := term.ReadPassword(int(syscall.Stdin))
		password = string(bytePassword)
		fmt.Println()

		fmt.Print("Confirm Password: ")
		byteConfirm, _ := term.ReadPassword(int(syscall.Stdin))
		fmt.Println()

		if password != string(byteConfirm) {
			return fmt.Errorf("passwords do not match")
		}
	}

	if err := validator.Password(password); err != nil {
		return err
	}

	if err := svc.ResetPassword(context.Background(), user.Username, password); err != nil {
		return err
	}

	fmt.Println("✓ Password updated successfully.")
	return nil
}
