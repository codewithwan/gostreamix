package ws

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/websocket/v2"
)

func NewHandler(hub *Hub) fiber.Handler {
	return websocket.New(func(c *websocket.Conn) {
		hub.Register(c)
		defer hub.Unregister(c)

		for {
			_, _, err := c.ReadMessage()
			if err != nil {
				break
			}
		}
	})
}
