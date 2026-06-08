package speedtest

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
	"go.uber.org/zap"
)

type Handler struct {
	svc Service
	log *zap.Logger
}

func NewHandler(svc Service, log *zap.Logger) *Handler {
	return &Handler{svc: svc, log: log}
}

func (h *Handler) Routes(app *fiber.App) {
	app.Get("/ws/speedtest", websocket.New(func(c *websocket.Conn) {
		defer c.Close()

		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		ch, err := h.svc.RunTest(ctx)
		if err != nil {
			h.log.Error("failed to start speedtest service run", zap.Error(err))
			_ = c.WriteJSON(SpeedtestMsg{Phase: "error"})
			return
		}

		for msg := range ch {
			if err := c.WriteJSON(msg); err != nil {
				h.log.Warn("failed to write speedtest websocket message", zap.Error(err))
				return
			}
		}
	}))
}
