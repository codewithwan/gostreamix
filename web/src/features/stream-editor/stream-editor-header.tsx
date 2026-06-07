import { ArrowLeft, Folder, Monitor, Save, Sliders, Tv, Zap } from "lucide-react"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EditorHeaderProps {
  name: string
  status: string
  dirty: boolean
  isLive: boolean
  saving: boolean
  applying: boolean
  onBack: () => void
  onToggleLibrary: () => void
  onOpenSettings: () => void
  onOpenTargets: () => void
  onOpenMonitor: () => void
  onSaveDraft: () => void
  onConfirmApply: () => void
  t: (key: string, fallback?: string) => string
}

export function EditorHeader(props: EditorHeaderProps) {
  return (
    <header className="h-14 shrink-0 flex items-center justify-between border-b px-2 sm:px-4 md:px-6 bg-card z-10">
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial mr-2">
        <Button type="button" variant="outline" size="sm" onClick={props.onBack} className="h-8 w-8 p-0 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1 sm:flex-initial">
          <h1 className="text-xs sm:text-sm md:text-base font-semibold flex items-center gap-1 sm:gap-2 min-w-0">
            <span className="truncate max-w-[80px] sm:max-w-[220px] md:max-w-none">{props.name || props.t("streamEditorTitle")}</span>
            <Badge variant={props.isLive ? "success" : "muted"} className={cn("font-medium capitalize py-0.5 px-1.5 text-[9px] sm:text-[10px] shrink-0", props.isLive && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20")}>
              {props.status}
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground truncate hidden sm:block">{props.t("streamEditorDescription")}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 shrink-0 min-w-0">
        {props.dirty ? (
          <span className="text-xs text-amber-500 font-medium hidden lg:inline-flex items-center gap-1.5 mr-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Unsaved Changes
          </span>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={props.onToggleLibrary} className="h-8 text-xs px-3 gap-1.5 transition hidden lg:inline-flex shrink-0">
          <Folder className="h-3.5 w-3.5" />
          <span>Library</span>
        </Button>
        <IconButton title="Settings" onClick={props.onOpenSettings} icon={<Sliders className="h-3.5 w-3.5" />} label="Settings" />
        <IconButton title="Destinations" onClick={props.onOpenTargets} icon={<Tv className="h-3.5 w-3.5" />} label="Destinations" />
        <IconButton title="Monitor" onClick={props.onOpenMonitor} icon={<Monitor className="h-3.5 w-3.5" />} label="Monitor" />
        <div className="h-4 w-px bg-border mx-0.5 sm:mx-1 shrink-0" />
        <Button type="button" variant="outline" size="sm" disabled={props.saving || !props.dirty} onClick={props.onSaveDraft} className="h-8 text-xs px-2 sm:px-3 gap-1 shrink-0 max-w-[90px] sm:max-w-none">
          <Save className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline truncate">{props.saving ? props.t("streamEditorSavingButton", "Saving...") : props.t("streamEditorSaveDraftButton", "Save draft")}</span>
          <span className="sm:hidden text-[10px] truncate">{props.saving ? "..." : "Save"}</span>
        </Button>
        <Button type="button" size="sm" disabled={props.applying || !props.dirty || !props.isLive} onClick={props.onConfirmApply} className="h-8 text-xs px-2 sm:px-3 gap-1 shrink-0 max-w-[92px] sm:max-w-none overflow-hidden">
          <Zap className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline truncate">{props.applying ? props.t("streamEditorApplyingButton") : props.t("streamEditorApplyLiveButton", "Apply live")}</span>
          <span className="sm:hidden text-[10px] truncate">{props.applying ? "..." : "Terapkan"}</span>
        </Button>
      </div>
    </header>
  )
}

function IconButton({ title, icon, label, onClick }: { title: string; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className="h-8 w-8 sm:w-auto p-0 sm:px-3 gap-0 sm:gap-1.5 text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0" title={title}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}
