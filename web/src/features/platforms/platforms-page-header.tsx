import { Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { PlatformForm } from "./platform-form"
import type { PlatformDraft } from "./platform-utils"
import { cn } from "@/lib/utils"
import type { TranslateFn } from "@/lib/i18n"

interface PlatformsPageHeaderProps {
  createOpen: boolean
  draft: PlatformDraft
  isRefreshing: boolean
  loading: boolean
  saving: boolean
  showCreateKey: boolean
  onCreateOpenChange: (open: boolean) => void
  onOpenCreate: () => void
  onRefresh: () => void
  onDraftChange: (draft: PlatformDraft) => void
  onSubmit: React.FormEventHandler<HTMLFormElement>
  onToggleShowKey: () => void
  t: TranslateFn
}

export function PlatformsPageHeader(props: PlatformsPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{props.t("platformsTitle")}</h1>
        <p className="text-sm text-muted-foreground">{props.t("platformsDescription")}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={props.onRefresh} disabled={props.isRefreshing || props.loading}>
          <RefreshCw className={cn("h-4 w-4", props.isRefreshing && "animate-spin")} />
          {props.t("refresh")}
        </Button>
        <Dialog open={props.createOpen} onOpenChange={props.onCreateOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={props.onOpenCreate}>
              <Plus className="h-4 w-4" />
              {props.t("platformsAddButton")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{props.t("platformsCreateTitle")}</DialogTitle>
              <DialogDescription>{props.t("platformsCreateDescription")}</DialogDescription>
            </DialogHeader>
            <PlatformForm draft={props.draft} onSubmit={props.onSubmit} onDraftChange={props.onDraftChange} showKey={props.showCreateKey} onToggleShowKey={props.onToggleShowKey} saving={props.saving} submitLabel={props.t("create")} t={props.t} />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
