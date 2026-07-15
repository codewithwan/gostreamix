package notification

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
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

	if settings.DiscordWebhook != "" {
		if err := validateDiscordWebhook(settings.DiscordWebhook); err != nil {
			return nil, err
		}
	}
	if settings.TelegramBotToken != "" || settings.TelegramChatID != "" {
		if err := validateTelegramConfig(settings.TelegramBotToken, settings.TelegramChatID); err != nil {
			return nil, err
		}
	}

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

func (s *service) SendTest(ctx context.Context, dto SendTestDTO) (*TestResult, error) {
	settings, err := s.GetSettings(ctx)
	if err != nil {
		return nil, err
	}

	channel := strings.ToLower(strings.TrimSpace(dto.Channel))
	text := strings.TrimSpace(dto.Message)
	if text == "" {
		text = "GoStreamix notification test"
	}
	if len(text) > 2000 {
		return nil, fmt.Errorf("test message is too long")
	}

	switch channel {
	case "discord":
		if settings.DiscordWebhook == "" {
			return nil, fmt.Errorf("discord webhook is not configured")
		}
		if err := validateDiscordWebhook(settings.DiscordWebhook); err != nil {
			return nil, err
		}
		result := discordTestResult(settings.DiscordWebhook, text)
		if err := s.sendDiscord(ctx, settings.DiscordWebhook, text); err != nil {
			return nil, err
		}
		result.Sent = true
		return result, nil
	case "telegram":
		if err := validateTelegramConfig(settings.TelegramBotToken, settings.TelegramChatID); err != nil {
			return nil, err
		}
		result := telegramTestResult(settings.TelegramChatID, text)
		if err := s.sendTelegram(ctx, settings.TelegramBotToken, settings.TelegramChatID, text); err != nil {
			return nil, err
		}
		result.Sent = true
		return result, nil
	default:
		return nil, fmt.Errorf("unsupported notification channel")
	}
}

// NotifyStreamEvent delivers a stream lifecycle event (start/stop/failure) to
// every configured channel. It is best-effort: missing configuration or a
// failing webhook is ignored so it never blocks or breaks the stream pipeline.
func (s *service) NotifyStreamEvent(ctx context.Context, streamName, status, event, detail string) {
	settings, err := s.GetSettings(ctx)
	if err != nil || settings == nil {
		return
	}
	if settings.DiscordWebhook == "" && settings.TelegramBotToken == "" {
		return
	}

	message := buildStreamEventMessage(streamName, status, event, detail)

	if settings.DiscordWebhook != "" {
		_ = s.sendDiscord(ctx, settings.DiscordWebhook, message)
	}
	if settings.TelegramBotToken != "" && settings.TelegramChatID != "" {
		_ = s.sendTelegram(ctx, settings.TelegramBotToken, settings.TelegramChatID, message)
	}
}

// buildStreamEventMessage renders the field-based message format understood by
// parseMessage (Header line followed by "Key: value" lines).
func buildStreamEventMessage(streamName, status, event, detail string) string {
	sanitize := func(v string) string {
		v = strings.ReplaceAll(v, "\n", " ")
		v = strings.TrimSpace(v)
		if len(v) > 300 {
			v = v[:300] + "…"
		}
		return v
	}

	var b strings.Builder
	b.WriteString("[GoStreamix] " + streamEventHeadline(status) + "\n")
	if streamName != "" {
		b.WriteString("Stream: " + sanitize(streamName) + "\n")
	}
	if status != "" {
		b.WriteString("Status: " + sanitize(status) + "\n")
	}
	if event != "" {
		b.WriteString("Trigger: " + sanitize(event) + "\n")
	}
	if detail != "" {
		b.WriteString("Detail: " + sanitize(detail) + "\n")
	}
	b.WriteString("Time: " + time.Now().Local().Format("2006-01-02 15:04:05 MST"))
	return b.String()
}

func streamEventHeadline(status string) string {
	switch strings.ToLower(strings.TrimSpace(status)) {
	case "running", "started", "active":
		return "Stream Started"
	case "error":
		return "Stream Failed"
	case "stopped", "stopping":
		return "Stream Stopped"
	default:
		return "Stream Update"
	}
}

func (s *service) DetectTelegramChats(ctx context.Context, dto DetectTelegramChatsDTO) ([]TelegramChatCandidate, error) {
	botToken := strings.TrimSpace(dto.BotToken)
	if err := validateTelegramBotToken(botToken); err != nil {
		return nil, err
	}

	endpoint := fmt.Sprintf("https://api.telegram.org/bot%s/getUpdates", botToken)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("telegram updates request: %w", err)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("telegram getUpdates: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("telegram returned status %d", resp.StatusCode)
	}

	var payload telegramUpdatesResponse
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode telegram updates: %w", err)
	}
	if !payload.OK {
		return nil, fmt.Errorf("telegram getUpdates failed")
	}

	chatsByID := make(map[string]TelegramChatCandidate)
	order := make([]string, 0)
	for _, update := range payload.Result {
		chat, preview := update.Chat()
		if chat == nil {
			continue
		}

		id := fmt.Sprintf("%d", chat.ID)
		if _, exists := chatsByID[id]; !exists {
			order = append(order, id)
		}
		chatsByID[id] = TelegramChatCandidate{
			ID:       id,
			Type:     chat.Type,
			Title:    chat.DisplayName(),
			Username: chat.Username,
			Preview:  preview,
		}
	}

	chats := make([]TelegramChatCandidate, 0, len(order))
	for _, id := range order {
		chats = append(chats, chatsByID[id])
	}
	if len(chats) == 0 {
		return nil, fmt.Errorf("no telegram chats found; send a message to the bot first")
	}

	return chats, nil
}
