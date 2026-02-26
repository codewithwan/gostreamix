import type { FormEvent } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { TranslateFn } from "@/lib/i18n"

import type { PlatformDraft } from "./platform-utils"

interface PlatformFormProps {
  draft: PlatformDraft
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onDraftChange: (next: PlatformDraft) => void
  showKey: boolean
  onToggleShowKey: () => void
  saving: boolean
  submitLabel: string
  t: TranslateFn
}

export function PlatformForm({
  draft,
  onSubmit,
  onDraftChange,
  showKey,
  onToggleShowKey,
  saving,
  submitLabel,
  t,
}: PlatformFormProps) {
  const updateField = <K extends keyof PlatformDraft>(key: K, value: PlatformDraft[K]) => {
    onDraftChange({ ...draft, [key]: value })
  }

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <Input
        placeholder={t("platformsNamePlaceholder")}
        value={draft.name}
        onChange={(event) => updateField("name", event.target.value)}
        required
      />

      <Select value={draft.platform_type} onValueChange={(value) => updateField("platform_type", value)}>
        <SelectTrigger>
          <SelectValue placeholder={t("platformTypeCustom")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="youtube">{t("platformTypeYoutube")}</SelectItem>
          <SelectItem value="twitch">{t("platformTypeTwitch")}</SelectItem>
          <SelectItem value="facebook">{t("platformTypeFacebook")}</SelectItem>
          <SelectItem value="tiktok">{t("platformTypeTiktok")}</SelectItem>
          <SelectItem value="custom">{t("platformTypeCustom")}</SelectItem>
        </SelectContent>
      </Select>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t("platformsStreamKeyHelp")}</p>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={onToggleShowKey}>
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {showKey ? t("hide") : t("show")}
          </Button>
        </div>
        <Input
          placeholder={t("platformsStreamKeyPlaceholder")}
          type={showKey ? "text" : "password"}
          value={draft.stream_key}
          onChange={(event) => updateField("stream_key", event.target.value)}
          required
        />
      </div>

      <Input
        placeholder={t("platformsCustomURLPlaceholder")}
        value={draft.custom_url}
        onChange={(event) => updateField("custom_url", event.target.value)}
      />

      <DialogFooter>
        <Button type="submit" disabled={saving}>
          {saving ? `${submitLabel}...` : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
