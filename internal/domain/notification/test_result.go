package notification

import (
	"net/http"
	"net/url"
	"strings"
)

func discordTestResult(webhookURL, message string) *TestResult {
	parsed, _ := url.Parse(webhookURL)
	return &TestResult{
		Channel:     "discord",
		Destination: parsed.Host,
		Method:      http.MethodPost,
		ContentType: "application/json",
		Payload: map[string]string{
			"content": message,
		},
	}
}

func telegramTestResult(chatID, message string) *TestResult {
	return &TestResult{
		Channel:     "telegram",
		Destination: maskSecret(chatID),
		Method:      http.MethodPost,
		ContentType: "application/x-www-form-urlencoded",
		Payload: map[string]string{
			"chat_id": maskSecret(chatID),
			"text":    message,
		},
	}
}

func maskSecret(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	if len(value) <= 8 {
		return value[:1] + "***"
	}
	return value[:4] + "***" + value[len(value)-4:]
}
