package notification

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

func validateDiscordWebhook(webhookURL string) error {
	parsed, err := url.Parse(strings.TrimSpace(webhookURL))
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return fmt.Errorf("discord webhook must be a valid https URL")
	}

	host := strings.ToLower(parsed.Host)
	if host != "discord.com" && host != "discordapp.com" {
		return fmt.Errorf("discord webhook host is not valid")
	}
	if !strings.HasPrefix(parsed.Path, "/api/webhooks/") {
		return fmt.Errorf("discord webhook path is not valid")
	}
	return nil
}

func validateTelegramConfig(botToken, chatID string) error {
	botToken = strings.TrimSpace(botToken)
	chatID = strings.TrimSpace(chatID)
	if botToken == "" || chatID == "" {
		return fmt.Errorf("telegram bot token and chat id are required")
	}
	if err := validateTelegramBotToken(botToken); err != nil {
		return err
	}
	chatPattern := regexp.MustCompile(`^(-?\d+|@[A-Za-z0-9_]{5,})$`)
	if !chatPattern.MatchString(chatID) {
		return fmt.Errorf("telegram chat id format is not valid")
	}
	return nil
}

func validateTelegramBotToken(botToken string) error {
	tokenPattern := regexp.MustCompile(`^\d+:[A-Za-z0-9_-]{20,}$`)
	if !tokenPattern.MatchString(strings.TrimSpace(botToken)) {
		return fmt.Errorf("telegram bot token format is not valid")
	}
	return nil
}
