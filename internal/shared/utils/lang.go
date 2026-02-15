package utils

import "github.com/gofiber/fiber/v2"

func GetLang(c *fiber.Ctx) string {
	lang, _ := c.Locals("lang").(string)
	if lang == "" {
		lang = "en"
	}
	return lang
}
