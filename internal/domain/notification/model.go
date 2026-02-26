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
