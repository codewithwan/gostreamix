import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { detectTelegramChats, getNotificationSettings, getProfile, saveNotificationSettings, sendNotificationTest, type NotificationSettings, type TelegramChatCandidate } from "@/lib/api"
import { emptySettings, hostFromURL, maskText, type Channel } from "./settings-utils"

export function useSettingsPage(t: (key: string, fallback?: string, values?: Record<string, string | number>) => string) {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [notification, setNotification] = useState<NotificationSettings>(emptySettings)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeChannel, setActiveChannel] = useState<Channel>("discord")
  const [discordWebhookDraft, setDiscordWebhookDraft] = useState("")
  const [telegramTokenDraft, setTelegramTokenDraft] = useState("")
  const [telegramChatDraft, setTelegramChatDraft] = useState("")
  const [telegramStep, setTelegramStep] = useState<1 | 2>(1)
  const [savingChannel, setSavingChannel] = useState(false)
  const [testingChannel, setTestingChannel] = useState<Channel | "">("")
  const [detectingTelegramChats, setDetectingTelegramChats] = useState(false)
  const [telegramChatCandidates, setTelegramChatCandidates] = useState<TelegramChatCandidate[]>([])

  const [loading, setLoading] = useState(true)

  const channelRows = useMemo(
    () => [
      {
        channel: "discord" as const,
        label: t("settingsDiscord"),
        configured: Boolean(notification.discord_webhook.trim()),
        summary: notification.discord_webhook.trim() ? hostFromURL(notification.discord_webhook) : t("settingsNotConfigured"),
      },
      {
        channel: "telegram" as const,
        label: t("settingsTelegram"),
        configured: Boolean(notification.telegram_bot_token.trim() && notification.telegram_chat_id.trim()),
        summary:
          notification.telegram_bot_token.trim() && notification.telegram_chat_id.trim()
            ? `${maskText(notification.telegram_bot_token)} / ${maskText(notification.telegram_chat_id)}`
            : t("settingsNotConfigured"),
      },
    ],
    [notification, t],
  )

  useEffect(() => {
    let mounted = true
    const loadData = async () => {
      try {
        const [profile, notif] = await Promise.all([getProfile(), getNotificationSettings()])
        if (!mounted) return
        setUsername(profile.username)
        setEmail(profile.email)
        setNotification({
          discord_webhook: notif.discord_webhook || "",
          telegram_bot_token: notif.telegram_bot_token || "",
          telegram_chat_id: notif.telegram_chat_id || "",
        })
      } catch (err) {
        if (!mounted) return
        const message = err instanceof Error ? err.message : t("settingsLoadFailed")
        setError(message)
        toast.error(message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void loadData()
    return () => {
      mounted = false
    }
  }, [t])

  const openChannelDialog = (channel: Channel) => {
    setActiveChannel(channel)
    setDiscordWebhookDraft(notification.discord_webhook || "")
    setTelegramTokenDraft(notification.telegram_bot_token || "")
    setTelegramChatDraft(notification.telegram_chat_id || "")
    setTelegramStep(1)
    setTelegramChatCandidates([])
    setDialogOpen(true)
  }

  const saveChannel = async () => {
    setSavingChannel(true)
    const payload = nextPayload(notification, activeChannel, discordWebhookDraft, telegramTokenDraft, telegramChatDraft)
    if (activeChannel === "telegram" && !payload.telegram_chat_id) {
      toast.error(t("settingsTelegramChatRequired", "Choose a Telegram chat ID first"))
      setSavingChannel(false)
      return
    }
    try {
      const saved = await saveNotificationSettings(payload)
      setNotification({
        discord_webhook: saved.discord_webhook || "",
        telegram_bot_token: saved.telegram_bot_token || "",
        telegram_chat_id: saved.telegram_chat_id || "",
      })
      setDialogOpen(false)
      toast.success(t("settingsSaveSuccess", "{channel} settings saved", { channel: activeChannel === "discord" ? t("settingsDiscord") : t("settingsTelegram") }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsSaveFailed"))
    } finally {
      setSavingChannel(false)
    }
  }

  const testChannel = async (channel: Channel) => {
    if (!isConfigured(notification, channel)) {
      toast.error(t("settingsNotConfigured"))
      return
    }
    setTestingChannel(channel)
    try {
      const channelLabel = channel === "discord" ? t("settingsDiscord") : t("settingsTelegram")
      await sendNotificationTest(channel, t("settingsSampleNotificationMessage"))
      toast.success(t("settingsTestSuccess", "{channel} test sent. Check Activity Log for details.", { channel: channelLabel }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsTestFailed"))
    } finally {
      setTestingChannel("")
    }
  }

  const detectChats = async () => {
    const token = telegramTokenDraft.trim()
    if (!token) {
      toast.error(t("settingsTelegramTokenRequired", "Telegram bot token is required"))
      return
    }
    setDetectingTelegramChats(true)
    setTelegramChatCandidates([])
    try {
      const result = await detectTelegramChats(token)
      setTelegramChatCandidates(result.items)
      toast.success(t("settingsTelegramChatsFound", "Found {count} chat(s)", { count: result.items.length }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsTelegramChatsFailed", "Failed to detect Telegram chats"))
    } finally {
      setDetectingTelegramChats(false)
    }
  }

  return {
    activeChannel, channelRows, detectChats, detectingTelegramChats, dialogOpen, discordWebhookDraft, email, error,
    loading, openChannelDialog, saveChannel, savingChannel, setDialogOpen, setDiscordWebhookDraft, setTelegramChatDraft,
    setTelegramStep, setTelegramTokenDraft, telegramChatCandidates, telegramChatDraft, telegramStep, telegramTokenDraft,
    testChannel, testingChannel, username,
  }
}

function nextPayload(base: NotificationSettings, channel: Channel, discordWebhook: string, telegramToken: string, telegramChat: string) {
  const payload = { ...base }
  if (channel === "discord") payload.discord_webhook = discordWebhook.trim()
  if (channel === "telegram") {
    payload.telegram_bot_token = telegramToken.trim()
    payload.telegram_chat_id = telegramChat.trim()
  }
  return payload
}

function isConfigured(notification: NotificationSettings, channel: Channel) {
  return channel === "discord"
    ? Boolean(notification.discord_webhook.trim())
    : Boolean(notification.telegram_bot_token.trim() && notification.telegram_chat_id.trim())
}
