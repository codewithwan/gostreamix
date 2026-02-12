package core

import (
	"github.com/codewithwan/gostreamix/internal/server"
	"go.uber.org/dig"
	"go.uber.org/zap"
)

func Bootstrap(c *dig.Container) error {
	return c.Invoke(func(s *server.Server, l *zap.Logger) {
		if err := s.Start(); err != nil {
			l.Fatal("fail", zap.Error(err))
		}
	})
}
