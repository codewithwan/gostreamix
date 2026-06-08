package test

import (
	"context"
	"testing"

	"github.com/codewithwan/gostreamix/internal/domain/notification"
	"github.com/stretchr/testify/require"
)

type fakeNotificationRepo struct {
	settings *notification.Settings
}

func (r *fakeNotificationRepo) Get(ctx context.Context) (*notification.Settings, error) {
	return r.settings, nil
}

func (r *fakeNotificationRepo) Create(ctx context.Context, s *notification.Settings) error {
	r.settings = s
	return nil
}

func (r *fakeNotificationRepo) Update(ctx context.Context, s *notification.Settings) error {
	r.settings = s
	return nil
}

func TestSendTestRejectsInvalidChannelAndConfig(t *testing.T) {
	svc := notification.NewService(&fakeNotificationRepo{settings: &notification.Settings{}})

	_, err := svc.SendTest(context.Background(), notification.SendTestDTO{Channel: "email"})
	require.ErrorContains(t, err, "unsupported notification channel")

	_, err = svc.SendTest(context.Background(), notification.SendTestDTO{Channel: "telegram"})
	require.ErrorContains(t, err, "telegram bot token and chat id are required")
}

func TestSaveSettingsValidatesNotificationConfig(t *testing.T) {
	svc := notification.NewService(&fakeNotificationRepo{})

	_, err := svc.SaveSettings(context.Background(), notification.SaveSettingsDTO{
		DiscordWebhook: "https://example.com/not-discord",
	})
	require.ErrorContains(t, err, "discord webhook host is not valid")

	_, err = svc.SaveSettings(context.Background(), notification.SaveSettingsDTO{
		TelegramBotToken: "bad-token",
		TelegramChatID:   "123",
	})
	require.ErrorContains(t, err, "telegram bot token format is not valid")
}

func TestSaveSettingsCreatesAndUpdatesSettings(t *testing.T) {
	repo := &fakeNotificationRepo{}
	svc := notification.NewService(repo)

	created, err := svc.SaveSettings(context.Background(), notification.SaveSettingsDTO{
		DiscordWebhook: "https://discord.com/api/webhooks/123/token",
	})
	require.NoError(t, err)
	require.Equal(t, "https://discord.com/api/webhooks/123/token", created.DiscordWebhook)
	require.Equal(t, created, repo.settings)

	repo.settings.ID = 1
	updated, err := svc.SaveSettings(context.Background(), notification.SaveSettingsDTO{})
	require.NoError(t, err)
	require.Empty(t, updated.DiscordWebhook)
	require.Equal(t, updated, repo.settings)
}

func TestDetectTelegramChatsRejectsInvalidBotToken(t *testing.T) {
	svc := notification.NewService(&fakeNotificationRepo{})

	_, err := svc.DetectTelegramChats(context.Background(), notification.DetectTelegramChatsDTO{BotToken: "bad-token"})
	require.ErrorContains(t, err, "telegram bot token format is not valid")
}
