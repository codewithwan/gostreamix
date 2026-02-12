package dashboard

import (
	"context"
)

type Service interface {
	GetGlobalStats(ctx context.Context) (map[string]any, error)
}
