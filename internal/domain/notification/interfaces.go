package notification

import "context"

type Repository interface {
	Get(ctx context.Context) (*Settings, error)
	Create(ctx context.Context, s *Settings) error
	Update(ctx context.Context, s *Settings) error
}

type Service interface {
	GetSettings(ctx context.Context) (*Settings, error)
	SaveSettings(ctx context.Context, dto SaveSettingsDTO) (*Settings, error)
	SendTest(ctx context.Context, dto SendTestDTO) (*TestResult, error)
	DetectTelegramChats(ctx context.Context, dto DetectTelegramChatsDTO) ([]TelegramChatCandidate, error)
	NotifyStreamEvent(ctx context.Context, streamName, status, event, detail string)
}
