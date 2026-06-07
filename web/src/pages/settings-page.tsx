import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { NotificationsCard } from "@/features/settings/notifications-card"
import { NotificationDialog } from "@/features/settings/notification-dialog"
import { ProfileCard } from "@/features/settings/profile-card"
import { useSettingsPage } from "@/features/settings/use-settings-page"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { ActivityPage } from "./activity-page"

export function SettingsPage() {
  const { t } = useI18n()
  const settings = useSettingsPage(t)
  const [searchParams, setSearchParams] = useSearchParams()

  const initialTab = (searchParams.get("tab") as "profile" | "notifications" | "activity") || "profile"
  const [activeTab, setActiveTab] = useState<"profile" | "notifications" | "activity">(initialTab)

  const handleTabChange = (tab: "profile" | "notifications" | "activity") => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("settingsTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("settingsDescription")}</p>
      </div>

      <div className="flex gap-1.5 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => handleTabChange("profile")}
          className={cn(
            "text-sm font-semibold px-4 py-2 rounded-t-md border-b-2 -mb-[6px] transition-all",
            activeTab === "profile" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t("settingsProfileTitle", "Profile")}
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("notifications")}
          className={cn(
            "text-sm font-semibold px-4 py-2 rounded-t-md border-b-2 -mb-[6px] transition-all",
            activeTab === "notifications" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t("settingsNotificationsTitle", "Notifications")}
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("activity")}
          className={cn(
            "text-sm font-semibold px-4 py-2 rounded-t-md border-b-2 -mb-[6px] transition-all",
            activeTab === "activity" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t("activityTitle", "Activity Log")}
        </button>
      </div>

      {settings.error ? <p className="text-sm text-danger">{settings.error}</p> : null}

      {activeTab === "profile" && (
        <ProfileCard email={settings.email} t={t} username={settings.username} />
      )}

      {activeTab === "notifications" && (
        <NotificationsCard
          channelRows={settings.channelRows}
          onConfigure={settings.openChannelDialog}
          onTest={(channel) => void settings.testChannel(channel)}
          t={t}
          testingChannel={settings.testingChannel}
        />
      )}

      {activeTab === "activity" && (
        <ActivityPage embed />
      )}

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
