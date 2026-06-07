package notification

import (
	"fmt"
	"strings"
)

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
