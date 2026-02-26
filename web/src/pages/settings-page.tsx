import { useEffect, useMemo, useState } from "react"
import { Bell, Send, User } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  getNotificationSettings,
  getProfile,
  saveNotificationSettings,
  sendNotificationTest,
  type NotificationSettings,
} from "@/lib/api"
import { useI18n } from "@/lib/i18n"

const emptySettings: NotificationSettings = {
  discord_webhook: "",
  telegram_bot_token: "",
  telegram_chat_id: "",
}

type Channel = "discord" | "telegram"

function maskText(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }
  if (trimmed.length <= 10) {
    return `${trimmed.slice(0, 2)}***`
  }
  return `${trimmed.slice(0, 4)}***${trimmed.slice(-4)}`
}

function hostFromURL(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ""
  }
  try {
    return new URL(trimmed).host
  } catch {
    return maskText(trimmed)
  }
}

export function SettingsPage() {
  const { t } = useI18n()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  const [notification, setNotification] = useState<NotificationSettings>(emptySettings)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [activeChannel, setActiveChannel] = useState<Channel>("discord")
  const [discordWebhookDraft, setDiscordWebhookDraft] = useState("")
  const [telegramTokenDraft, setTelegramTokenDraft] = useState("")
  const [telegramChatDraft, setTelegramChatDraft] = useState("")
  const [savingChannel, setSavingChannel] = useState(false)
  const [testingChannel, setTestingChannel] = useState<Channel | "">("")

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
        if (!mounted) {
          return
        }

        setUsername(profile.username)
        setEmail(profile.email)
        setNotification({
          discord_webhook: notif.discord_webhook || "",
          telegram_bot_token: notif.telegram_bot_token || "",
          telegram_chat_id: notif.telegram_chat_id || "",
        })
      } catch (err) {
        if (!mounted) {
          return
        }

        const message = err instanceof Error ? err.message : t("settingsLoadFailed")
        setError(message)
        toast.error(message)
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
    setDialogOpen(true)
  }

  const saveChannel = async () => {
    setSavingChannel(true)

    const payload: NotificationSettings = {
      discord_webhook: notification.discord_webhook || "",
      telegram_bot_token: notification.telegram_bot_token || "",
      telegram_chat_id: notification.telegram_chat_id || "",
    }

    if (activeChannel === "discord") {
      payload.discord_webhook = discordWebhookDraft.trim()
    }

    if (activeChannel === "telegram") {
      payload.telegram_bot_token = telegramTokenDraft.trim()
      payload.telegram_chat_id = telegramChatDraft.trim()
    }

    try {
      const saved = await saveNotificationSettings(payload)
      setNotification({
        discord_webhook: saved.discord_webhook || "",
        telegram_bot_token: saved.telegram_bot_token || "",
        telegram_chat_id: saved.telegram_chat_id || "",
      })
      setDialogOpen(false)
      toast.success(
        t("settingsSaveSuccess", "{channel} settings saved", {
          channel: activeChannel === "discord" ? t("settingsDiscord") : t("settingsTelegram"),
        }),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : t("settingsSaveFailed")
      toast.error(message)
    } finally {
      setSavingChannel(false)
    }
  }

  const testChannel = async (channel: Channel) => {
    if (channel === "discord" && !notification.discord_webhook.trim()) {
      toast.error(t("settingsNotConfigured"))
      return
    }

    if (channel === "telegram" && !(notification.telegram_bot_token.trim() && notification.telegram_chat_id.trim())) {
      toast.error(t("settingsNotConfigured"))
      return
    }

    setTestingChannel(channel)
    try {
      const channelLabel = channel === "discord" ? t("settingsDiscord") : t("settingsTelegram")
      await sendNotificationTest(`[${channelLabel}] GoStreamix test alert`)
      toast.success(
        t("settingsTestSuccess", "{channel} test sent", {
          channel: channelLabel,
        }),
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : t("settingsTestFailed")
      toast.error(message)
    } finally {
      setTestingChannel("")
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("settingsTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("settingsDescription")}</p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            {t("settingsProfileTitle")}
          </CardTitle>
          <CardDescription>{t("settingsProfileDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">{t("settingsUsername")}:</span> {username || "-"}
          </p>
          <p>
            <span className="text-muted-foreground">{t("settingsEmail")}:</span> {email || "-"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            {t("settingsNotificationsTitle")}
          </CardTitle>
          <CardDescription>{t("settingsNotificationsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="grid gap-3 md:hidden">
            {channelRows.map((row) => (
              <div key={row.channel} className="rounded-md border border-border bg-muted/35 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{row.label}</p>
                  {row.configured ? (
                    <span className="text-xs text-green-600 dark:text-green-400">{t("settingsConnected")}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t("settingsNotConfigured")}</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{row.summary}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => openChannelDialog(row.channel)}>
                    {row.configured ? t("edit") : t("add")}
                  </Button>
                  <Button size="sm" variant="outline" disabled={!row.configured || testingChannel === row.channel} onClick={() => void testChannel(row.channel)}>
                    <Send className="h-4 w-4" />
                    {testingChannel === row.channel ? t("settingsTesting") : t("settingsTest")}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-2 py-1">{t("settingsIntegration")}</th>
                  <th className="px-2 py-1">{t("settingsConfiguration")}</th>
                  <th className="px-2 py-1">{t("status")}</th>
                  <th className="px-2 py-1">{t("settingsActions")}</th>
                </tr>
              </thead>
              <tbody>
                {channelRows.map((row) => (
                  <tr key={row.channel} className="rounded-md bg-muted/35">
                    <td className="rounded-l-md px-2 py-2 font-medium">{row.label}</td>
                    <td className="max-w-[300px] px-2 py-2 text-xs text-muted-foreground">{row.summary}</td>
                    <td className="px-2 py-2">
                      {row.configured ? (
                        <span className="text-xs text-green-600 dark:text-green-400">{t("settingsConnected")}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("settingsNotConfigured")}</span>
                      )}
                    </td>
                    <td className="rounded-r-md px-2 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => openChannelDialog(row.channel)}>
                          {row.configured ? t("edit") : t("add")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!row.configured || testingChannel === row.channel}
                          onClick={() => void testChannel(row.channel)}
                        >
                          <Send className="h-4 w-4" />
                          {testingChannel === row.channel ? t("settingsTesting") : t("settingsTest")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {activeChannel === "discord" ? t("settingsDiscord") : t("settingsTelegram")} - {t("settingsConfigure")}
            </DialogTitle>
            <DialogDescription>{t("settingsNotificationsDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {activeChannel === "discord" ? (
              <Input
                placeholder={t("settingsDiscordWebhookPlaceholder")}
                value={discordWebhookDraft}
                onChange={(event) => setDiscordWebhookDraft(event.target.value)}
              />
            ) : (
              <>
                <Input
                  placeholder={t("settingsTelegramTokenPlaceholder")}
                  value={telegramTokenDraft}
                  onChange={(event) => setTelegramTokenDraft(event.target.value)}
                />
                <Input
                  placeholder={t("settingsTelegramChatPlaceholder")}
                  value={telegramChatDraft}
                  onChange={(event) => setTelegramChatDraft(event.target.value)}
                />
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" disabled={savingChannel} onClick={() => void saveChannel()}>
              {savingChannel ? t("settingsSavingChannel") : t("settingsSaveChannel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
