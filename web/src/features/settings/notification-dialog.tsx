import { Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { TelegramChatCandidate } from "@/lib/api"
import type { Channel } from "./settings-utils"

interface NotificationDialogProps {
  activeChannel: Channel
  detectingTelegramChats: boolean
  discordWebhookDraft: string
  onDetectChats: () => void
  onOpenChange: (open: boolean) => void
  onSave: () => void
  onTelegramStepChange: (step: 1 | 2) => void
  open: boolean
  savingChannel: boolean
  setDiscordWebhookDraft: (value: string) => void
  setTelegramChatDraft: (value: string) => void
  setTelegramTokenDraft: (value: string) => void
  t: (key: string, fallback?: string) => string
  telegramChatCandidates: TelegramChatCandidate[]
  telegramChatDraft: string
  telegramStep: 1 | 2
  telegramTokenDraft: string
}

export function NotificationDialog(props: NotificationDialogProps) {
  const { activeChannel, onOpenChange, open, t } = props
  const canContinueTelegram = props.telegramTokenDraft.trim().length > 0
  const canSaveTelegram = canContinueTelegram && props.telegramChatDraft.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{activeChannel === "discord" ? t("settingsDiscord") : t("settingsTelegram")} - {t("settingsConfigure")}</DialogTitle>
          <DialogDescription>{t("settingsNotificationsDescription")}</DialogDescription>
        </DialogHeader>
        {activeChannel === "discord" ? <DiscordForm {...props} /> : <TelegramForm {...props} />}
        <DialogFooter>
          {activeChannel === "telegram" && props.telegramStep === 2 ? (
            <Button type="button" variant="outline" onClick={() => props.onTelegramStepChange(1)}>{t("back", "Back")}</Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          )}
          {activeChannel === "telegram" && props.telegramStep === 1 ? (
            <Button type="button" disabled={!canContinueTelegram} onClick={() => props.onTelegramStepChange(2)}>{t("next", "Next")}</Button>
          ) : (
            <Button type="button" disabled={props.savingChannel || (activeChannel === "telegram" && !canSaveTelegram)} onClick={props.onSave}>
              {props.savingChannel ? t("settingsSavingChannel") : t("settingsSaveChannel")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DiscordForm({ discordWebhookDraft, setDiscordWebhookDraft, t }: NotificationDialogProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{t("settingsDiscordWebhookPlaceholder")}</span>
      <Input placeholder={t("settingsDiscordWebhookPlaceholder")} value={discordWebhookDraft} onChange={(event) => setDiscordWebhookDraft(event.target.value)} />
    </label>
  )
}

function TelegramForm(props: NotificationDialogProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant={props.telegramStep === 1 ? "default" : "muted"}>{props.t("settingsTelegramStepToken", "1. Token")}</Badge>
        <Badge variant={props.telegramStep === 2 ? "default" : "muted"}>{props.t("settingsTelegramStepChat", "2. Chat ID")}</Badge>
      </div>
      {props.telegramStep === 1 ? <TelegramTokenStep {...props} /> : <TelegramChatStep {...props} />}
    </div>
  )
}

function TelegramTokenStep({ setTelegramTokenDraft, setTelegramChatDraft, t, telegramTokenDraft }: NotificationDialogProps) {
  return (
    <div className="space-y-3">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{t("settingsTelegramTokenPlaceholder")}</span>
        <Input
          placeholder={t("settingsTelegramTokenPlaceholder")}
          value={telegramTokenDraft}
          onChange={(event) => {
            setTelegramTokenDraft(event.target.value)
            setTelegramChatDraft("")
          }}
        />
      </label>
      <p className="text-xs text-muted-foreground">{t("settingsTelegramTokenHelp", "Paste the bot token from BotFather. After this, send any message to the bot from Telegram.")}</p>
    </div>
  )
}

function TelegramChatStep(props: NotificationDialogProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{props.t("settingsTelegramDetectHint", "Send any message to your bot, then detect chat ID.")}</p>
          <Button type="button" variant="outline" size="sm" disabled={props.detectingTelegramChats} onClick={props.onDetectChats}>
            <Search className="h-4 w-4" />
            {props.detectingTelegramChats ? props.t("settingsTelegramDetecting", "Detecting...") : props.t("settingsTelegramDetect", "Detect chat ID")}
          </Button>
        </div>
        {props.telegramChatCandidates.length > 0 ? <TelegramChatCandidates {...props} /> : null}
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{props.t("settingsTelegramChatPlaceholder")}</span>
        <Input placeholder={props.t("settingsTelegramChatPlaceholder")} value={props.telegramChatDraft} onChange={(event) => props.setTelegramChatDraft(event.target.value)} />
      </label>
    </div>
  )
}

function TelegramChatCandidates({ setTelegramChatDraft, telegramChatCandidates, telegramChatDraft }: NotificationDialogProps) {
  return (
    <div className="mt-3 grid gap-2">
      {telegramChatCandidates.map((chat) => {
        const selected = telegramChatDraft === chat.id
        return (
          <button key={chat.id} type="button" className={`rounded-md border px-3 py-2 text-left hover:bg-muted ${selected ? "border-primary bg-primary/10" : "border-border bg-card"}`} onClick={() => setTelegramChatDraft(chat.id)}>
            <span className="block text-sm font-medium">{chat.title || chat.username || chat.id} <span className="text-xs text-muted-foreground">({chat.type})</span></span>
            <span className="block text-xs text-muted-foreground">{chat.id}{chat.preview ? ` - ${chat.preview}` : ""}</span>
          </button>
        )
      })}
    </div>
  )
}
