package shared

import (
	"github.com/a-h/templ"
	"github.com/gofiber/fiber/v2"
)

func Render(c *fiber.Ctx, component templ.Component) error {
	c.Type("html", "utf-8")
	return component.Render(c.Context(), c.Response().BodyWriter())
}
