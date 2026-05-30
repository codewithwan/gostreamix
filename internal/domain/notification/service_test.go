package notification

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) {
	return f(r)
}

type fakeNotificationRepo struct {
	settings *Settings
}

func (r *fakeNotificationRepo) Get(ctx context.Context) (*Settings, error) {
	return r.settings, nil
}

func (r *fakeNotificationRepo) Create(ctx context.Context, s *Settings) error {
	r.settings = s
	return nil
}

func (r *fakeNotificationRepo) Update(ctx context.Context, s *Settings) error {
	r.settings = s
	return nil
}

func TestSendTest_DiscordUsesSelectedChannelAndReturnsPayload(t *testing.T) {
	var requests int

	svc := NewService(&fakeNotificationRepo{settings: &Settings{
		DiscordWebhook: "https://discord.com/api/webhooks/123/token",
	}}).(*service)
	svc.client = &http.Client{
		Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
			requests++
			require.Equal(t, http.MethodPost, r.Method)
			require.Equal(t, "application/json", r.Header.Get("Content-Type"))
			require.Equal(t, "discord.com", r.URL.Host)

			return &http.Response{
				StatusCode: http.StatusNoContent,
				Body:       io.NopCloser(bytes.NewReader(nil)),
				Header:     make(http.Header),
			}, nil
		}),
	}

	result, err := svc.SendTest(context.Background(), SendTestDTO{
		Channel: "discord",
		Message: "hello",
	})

	require.NoError(t, err)
	require.Equal(t, 1, requests)
	require.Equal(t, "discord", result.Channel)
	require.Equal(t, http.MethodPost, result.Method)
	require.Equal(t, "hello", result.Payload["content"])
	require.True(t, result.Sent)
}

func TestSendTest_RejectsInvalidChannelAndConfig(t *testing.T) {
	svc := NewService(&fakeNotificationRepo{settings: &Settings{}}).(*service)

	_, err := svc.SendTest(context.Background(), SendTestDTO{Channel: "email"})
	require.ErrorContains(t, err, "unsupported notification channel")

	_, err = svc.SendTest(context.Background(), SendTestDTO{Channel: "telegram"})
	require.ErrorContains(t, err, "telegram bot token and chat id are required")
}

func TestSaveSettings_ValidatesNotificationConfig(t *testing.T) {
	svc := NewService(&fakeNotificationRepo{}).(*service)

	_, err := svc.SaveSettings(context.Background(), SaveSettingsDTO{
		DiscordWebhook: "https://example.com/not-discord",
	})
	require.ErrorContains(t, err, "discord webhook host is not valid")

	_, err = svc.SaveSettings(context.Background(), SaveSettingsDTO{
		TelegramBotToken: "bad-token",
		TelegramChatID:   "123",
	})
	require.ErrorContains(t, err, "telegram bot token format is not valid")
}
