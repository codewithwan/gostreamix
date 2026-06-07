import { NotificationsCard } from "@/features/settings/notifications-card"
import { NotificationDialog } from "@/features/settings/notification-dialog"
import { ProfileCard } from "@/features/settings/profile-card"
import { useSettingsPage } from "@/features/settings/use-settings-page"
import { useI18n } from "@/lib/i18n"

export function SettingsPage() {
  const { t } = useI18n()
  const settings = useSettingsPage(t)

  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("settingsTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("settingsDescription")}</p>
      </div>

      {settings.error ? <p className="text-sm text-danger">{settings.error}</p> : null}
      <ProfileCard email={settings.email} t={t} username={settings.username} />
      <NotificationsCard
        channelRows={settings.channelRows}
        onConfigure={settings.openChannelDialog}
        onTest={(channel) => void settings.testChannel(channel)}
        t={t}
        testingChannel={settings.testingChannel}
      />
      <NotificationDialog
        activeChannel={settings.activeChannel}
        detectingTelegramChats={settings.detectingTelegramChats}
        discordWebhookDraft={settings.discordWebhookDraft}
        onDetectChats={() => void settings.detectChats()}
        onOpenChange={settings.setDialogOpen}
        onSave={() => void settings.saveChannel()}
        onTelegramStepChange={settings.setTelegramStep}
        open={settings.dialogOpen}
        savingChannel={settings.savingChannel}
        setDiscordWebhookDraft={settings.setDiscordWebhookDraft}
        setTelegramChatDraft={settings.setTelegramChatDraft}
        setTelegramTokenDraft={settings.setTelegramTokenDraft}
        t={t}
        telegramChatCandidates={settings.telegramChatCandidates}
        telegramChatDraft={settings.telegramChatDraft}
        telegramStep={settings.telegramStep}
        telegramTokenDraft={settings.telegramTokenDraft}
      />
    </section>
  )
}
