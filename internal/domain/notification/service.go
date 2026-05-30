package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"regexp"
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

type telegramUpdatesResponse struct {
	OK     bool             `json:"ok"`
	Result []telegramUpdate `json:"result"`
}

type telegramUpdate struct {
	Message           *telegramMessage `json:"message"`
	EditedMessage     *telegramMessage `json:"edited_message"`
	ChannelPost       *telegramMessage `json:"channel_post"`
	EditedChannelPost *telegramMessage `json:"edited_channel_post"`
}

func (u telegramUpdate) Chat() (*telegramChat, string) {
	if u.Message != nil {
		return &u.Message.Chat, u.Message.Preview()
	}
	if u.EditedMessage != nil {
		return &u.EditedMessage.Chat, u.EditedMessage.Preview()
	}
	if u.ChannelPost != nil {
		return &u.ChannelPost.Chat, u.ChannelPost.Preview()
	}
	if u.EditedChannelPost != nil {
		return &u.EditedChannelPost.Chat, u.EditedChannelPost.Preview()
	}
	return nil, ""
}

type telegramMessage struct {
	Text    string       `json:"text"`
	Caption string       `json:"caption"`
	Chat    telegramChat `json:"chat"`
}

func (m telegramMessage) Preview() string {
	if strings.TrimSpace(m.Text) != "" {
		return strings.TrimSpace(m.Text)
	}
	return strings.TrimSpace(m.Caption)
}

type telegramChat struct {
	ID        int64  `json:"id"`
	Type      string `json:"type"`
	Title     string `json:"title"`
	Username  string `json:"username"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func (c telegramChat) DisplayName() string {
	if strings.TrimSpace(c.Title) != "" {
		return strings.TrimSpace(c.Title)
	}
	parts := []string{strings.TrimSpace(c.FirstName), strings.TrimSpace(c.LastName)}
	name := strings.TrimSpace(strings.Join(parts, " "))
	if name != "" {
		return name
	}
	if c.Username != "" {
		return "@" + c.Username
	}
	return fmt.Sprintf("%d", c.ID)
}
