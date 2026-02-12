package dashboard

import (
	"context"

	"github.com/codewithwan/gostreamix/internal/domain/auth"
	"github.com/codewithwan/gostreamix/internal/domain/stream"
	"github.com/codewithwan/gostreamix/internal/domain/video"
)

type service struct {
	authSvc   auth.Service
	streamSvc stream.Service
	videoSvc  video.Service
}

func NewService(authSvc auth.Service, streamSvc stream.Service, videoSvc video.Service) Service {
	return &service{
		authSvc:   authSvc,
		streamSvc: streamSvc,
		videoSvc:  videoSvc,
	}
}

func (s *service) GetGlobalStats(ctx context.Context) (map[string]any, error) {
	return map[string]any{
		"streams_count": 0,
		"videos_count":  0,
		"cpu_usage":     "12%",
	}, nil
}
