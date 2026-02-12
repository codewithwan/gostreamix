package dashboard

import (
	"github.com/codewithwan/gostreamix/internal/shared/utils"
	"github.com/codewithwan/gostreamix/internal/ui/components/toast"
	"github.com/gofiber/fiber/v2"
)

func (h *Handler) GetToastSuccess(c *fiber.Ctx) error {
	return utils.Render(c, toast.Toast(toast.Props{
		Title:       "Authenticated",
		Description: "Welcome back to GoStreamix Engine.",
		Variant:     toast.VariantSuccess,
		Icon:        true,
	}))
}

func (h *Handler) GetToastSetupSuccess(c *fiber.Ctx) error {
	return utils.Render(c, toast.Toast(toast.Props{
		Title:       "Setup Complete",
		Description: "Admin account created successfully. Please login.",
		Variant:     toast.VariantSuccess,
		Icon:        true,
	}))
}
