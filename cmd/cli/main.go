package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"syscall"

	"github.com/codewithwan/gostreamix/internal/auth"
	"github.com/codewithwan/gostreamix/internal/config"
	"github.com/codewithwan/gostreamix/internal/storage"
	"golang.org/x/term"
)

func main() {
	reset := flag.Bool("reset-password", false, "Reset the primary user password")
	flag.Parse()

	if !*reset {
		fmt.Println("Usage: gostreamix-cli --reset-password")
		os.Exit(0)
	}

	cfg := config.NewConfig()
	db, err := storage.NewSQLiteDB(cfg)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	repo := auth.NewRepository(db)
	svc := auth.NewService(repo)

	user, err := svc.GetPrimaryUser(context.Background())
	if err != nil {
		fmt.Println("Error: No user found. Please setup the system first.")
		os.Exit(1)
	}

	fmt.Printf("Resetting password for user: %s\n", user.Username)
	fmt.Print("Enter New Password: ")
	bytePassword, _ := term.ReadPassword(int(syscall.Stdin))
	password := string(bytePassword)
	fmt.Println()

	fmt.Print("Confirm Password: ")
	byteConfirm, _ := term.ReadPassword(int(syscall.Stdin))
	confirm := string(byteConfirm)
	fmt.Println()

	if password != confirm {
		fmt.Println("Error: Passwords do not match.")
		os.Exit(1)
	}

	if err := svc.ResetPassword(context.Background(), user.Username, password); err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Success: Password updated.")
}
