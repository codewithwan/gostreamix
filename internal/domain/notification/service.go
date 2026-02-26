package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type service struct {
	repo   Repository
	client *http.Client
}

func NewService(repo Repository) Service {
	return &service{
		repo: repo,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (s *service) GetSettings(ctx context.Context) (*Settings, error) {
	settings, err := s.repo.Get(ctx)
	if err != nil {
		return nil, err
	}
	if settings == nil {
		return &Settings{}, nil
	}
	return settings, nil
}

func (s *service) SaveSettings(ctx context.Context, dto SaveSettingsDTO) (*Settings, error) {
	settings, err := s.repo.Get(ctx)
	if err != nil {
		return nil, err
	}

	if settings == nil {
		settings = &Settings{}
	}

	settings.DiscordWebhook = strings.TrimSpace(dto.DiscordWebhook)
	settings.TelegramBotToken = strings.TrimSpace(dto.TelegramBotToken)
	settings.TelegramChatID = strings.TrimSpace(dto.TelegramChatID)

	if settings.ID == 0 {
		if err := s.repo.Create(ctx, settings); err != nil {
			return nil, err
		}
		return settings, nil
	}

	if err := s.repo.Update(ctx, settings); err != nil {
		return nil, err
	}
	return settings, nil
}

func (s *service) SendTest(ctx context.Context, message string) error {
	settings, err := s.GetSettings(ctx)
	if err != nil {
		return err
	}

	text := strings.TrimSpace(message)
	if text == "" {
		text = "GoStreamix notification test"
	}

	if settings.DiscordWebhook == "" && (settings.TelegramBotToken == "" || settings.TelegramChatID == "") {
		return fmt.Errorf("notification channels are not configured")
	}

	var errs []string

	if settings.DiscordWebhook != "" {
		if err := s.sendDiscord(ctx, settings.DiscordWebhook, text); err != nil {
			errs = append(errs, err.Error())
		}
	}

	if settings.TelegramBotToken != "" && settings.TelegramChatID != "" {
		if err := s.sendTelegram(ctx, settings.TelegramBotToken, settings.TelegramChatID, text); err != nil {
			errs = append(errs, err.Error())
		}
	}

	if len(errs) > 0 {
		return errors.New(strings.Join(errs, "; "))
	}
	return nil
}

func (s *service) sendDiscord(ctx context.Context, webhookURL, message string) error {
	body, _ := json.Marshal(map[string]string{"content": message})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhookURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("discord request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("discord send: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("discord returned status %d", resp.StatusCode)
	}

	return nil
}

func (s *service) sendTelegram(ctx context.Context, botToken, chatID, message string) error {
	endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)
	data := url.Values{}
	data.Set("chat_id", chatID)
	data.Set("text", message)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return fmt.Errorf("telegram request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("telegram send: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("telegram returned status %d", resp.StatusCode)
	}

	return nil
}
