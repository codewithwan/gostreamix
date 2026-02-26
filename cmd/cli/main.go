package main

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
	"golang.org/x/term"
)

func main() {
	reset := flag.Bool("reset-password", false, "Reset the primary user password")
	setPwd := flag.String("set-password", "", "Directly set password to this value (non-interactive)")
	flag.Parse()

	if !*reset {
		fmt.Println("Usage: gostreamix-cli --reset-password [--set-password=<newpassword>]")
		os.Exit(0)
	}

	cfg := config.NewConfig()
	log, err := logger.NewLogger()
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	db, err := database.NewSQLiteDB(cfg, log)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	repo := auth.NewRepository(db)
	jwtSvc := jwt.NewJWTService(struct{ Secret string }{Secret: cfg.Secret})
	svc := auth.NewService(repo, jwtSvc)

	user, err := svc.GetPrimaryUser(context.Background())
	if err != nil {
		fmt.Println("Error: No user found. Please setup the system first.")
		os.Exit(1)
	}

	fmt.Printf("Resetting password for user: %s\n", user.Username)

	var password string

	if *setPwd != "" {
		// Non-interactive: use the value passed directly via --set-password
		password = *setPwd
		fmt.Println("Using provided password.")
	} else {
		// Interactive: prompt for password + confirmation
		fmt.Print("Enter New Password: ")
		bytePassword, _ := term.ReadPassword(int(syscall.Stdin))
		password = string(bytePassword)
		fmt.Println()

		fmt.Print("Confirm Password: ")
		byteConfirm, _ := term.ReadPassword(int(syscall.Stdin))
		confirm := string(byteConfirm)
		fmt.Println()

		if password != confirm {
			fmt.Println("Error: Passwords do not match.")
			os.Exit(1)
		}
	}

	if err := svc.ResetPassword(context.Background(), user.Username, password); err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("✓ Password updated successfully.")
}
