import type { NotificationSettings } from "@/lib/api"

export const emptySettings: NotificationSettings = {
  discord_webhook: "",
  telegram_bot_token: "",
  telegram_chat_id: "",
}

export type Channel = "discord" | "telegram"

export function maskText(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (trimmed.length <= 10) return `${trimmed.slice(0, 2)}***`
  return `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`
}

export function hostFromURL(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  try {
    return new URL(trimmed).host
  } catch {
    return maskText(trimmed)
  }
}
