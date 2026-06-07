import { request } from "./client"
import type { NotificationSettings, NotificationTestResult, TelegramChatCandidate } from "./types"

export async function getNotificationSettings() {
  return request<NotificationSettings>("/api/settings/notifications/")
}

export async function saveNotificationSettings(payload: NotificationSettings) {
  return request<NotificationSettings>("/api/settings/notifications/", {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function sendNotificationTest(channel: "discord" | "telegram", message: string) {
  return request<{ message: string; test: NotificationTestResult }>("/api/settings/notifications/test", {
    method: "POST",
    body: JSON.stringify({ channel, message }),
  })
}

export async function detectTelegramChats(botToken: string) {
  return request<{ items: TelegramChatCandidate[] }>("/api/settings/notifications/telegram/chats", {
    method: "POST",
    body: JSON.stringify({ bot_token: botToken }),
  })
}
