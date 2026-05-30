package notification

import (
	"time"

	"github.com/uptrace/bun"
)

type Settings struct {
	bun.BaseModel `bun:"table:notification_settings,alias:ns"`

	ID               int64     `bun:",pk,autoincrement" json:"id"`
	DiscordWebhook   string    `bun:",type:text" json:"discord_webhook"`
	TelegramBotToken string    `bun:",type:text" json:"telegram_bot_token"`
	TelegramChatID   string    `bun:",type:text" json:"telegram_chat_id"`
	UpdatedAt        time.Time `bun:",nullzero,notnull,default:current_timestamp" json:"updated_at"`
}

type SaveSettingsDTO struct {
	DiscordWebhook   string `json:"discord_webhook"`
	TelegramBotToken string `json:"telegram_bot_token"`
	TelegramChatID   string `json:"telegram_chat_id"`
}

type SendTestDTO struct {
	Channel string `json:"channel"`
	Message string `json:"message"`
}

type TestResult struct {
	Channel     string            `json:"channel"`
	Destination string            `json:"destination"`
	Method      string            `json:"method"`
	ContentType string            `json:"content_type"`
	Payload     map[string]string `json:"payload"`
	Sent        bool              `json:"sent"`
}

type DetectTelegramChatsDTO struct {
	BotToken string `json:"bot_token"`
}

type TelegramChatCandidate struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Title    string `json:"title"`
	Username string `json:"username"`
	Preview  string `json:"preview"`
}
