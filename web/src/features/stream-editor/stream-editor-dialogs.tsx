import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PlatformIcon } from "@/features/platforms/platform-icon"
import type { PlatformTarget } from "./stream-editor-types"
import { OUTPUT_PROFILES, formatTime } from "./stream-editor-utils"
import type { StreamStats } from "@/lib/api"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  bitrate: number
  resolution: string
  fps: number
  onNameChange: (value: string) => void
  onBitrateChange: (value: number) => void
  onResolutionChange: (value: string) => void
  onFpsChange: (value: number) => void
  t: (key: string, fallback?: string) => string
}

export function SettingsDialog(props: SettingsDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card">
        <DialogHeader>
          <DialogTitle>{props.t("streamEditorIdentityTitle", "Settings")}</DialogTitle>
          <DialogDescription>Configure stream metadata and performance parameters.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{props.t("streamEditorOutputProfiles", "Output Profile")}</label>
            <div className="grid grid-cols-3 gap-1.5">
              {OUTPUT_PROFILES.map((profile) => (
                <Button key={profile.id} type="button" variant={props.resolution === profile.resolution && props.bitrate === profile.bitrate && props.fps === profile.fps ? "default" : "outline"} size="sm" onClick={() => { props.onResolutionChange(profile.resolution); props.onBitrateChange(profile.bitrate); props.onFpsChange(profile.fps) }} className="h-8 text-[10px] px-1">{profile.label}</Button>
              ))}
            </div>
          </div>
          <InputBlock label={props.t("streamEditorNamePlaceholder", "Stream Name")} value={props.name} onChange={props.onNameChange} />
          <div className="grid grid-cols-2 gap-3">
            <InputBlock label={props.t("streamEditorBitratePlaceholder", "Bitrate (kbps)")} value={String(props.bitrate)} type="number" onChange={(value) => props.onBitrateChange(Number(value))} />
            <InputBlock label={props.t("streamEditorFpsPlaceholder", "FPS")} value={String(props.fps)} type="number" onChange={(value) => props.onFpsChange(Number(value))} />
          </div>
          <InputBlock label={props.t("streamEditorResolutionPlaceholder", "Resolution")} value={props.resolution} onChange={props.onResolutionChange} />
        </div>
        <DialogFooter><Button type="button" onClick={() => props.onOpenChange(false)}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TargetsDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  targets: string[]
  platforms: PlatformTarget[]
  draft: string
  onDraftChange: (value: string) => void
  onAddTarget: (target: string) => void
  onRemoveTarget: (target: string) => void
  t: (key: string, fallback?: string) => string
}) {
  const selected = new Set(props.targets)
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto bg-card">
        <DialogHeader><DialogTitle>RTMP Destinations</DialogTitle><DialogDescription>{props.t("streamEditorTargetsDescription", "Choose platform presets for this stream.")}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2">
          <TargetList targets={props.targets} platforms={props.platforms} onRemoveTarget={props.onRemoveTarget} t={props.t} />
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{props.t("platforms", "Platform Presets")}</label>
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {props.platforms.map((platform) => (
                <button key={platform.id} type="button" onClick={() => props.onAddTarget(platform.rtmp_url)} disabled={selected.has(platform.rtmp_url)} className="w-full flex items-center gap-2 rounded-lg border border-border/80 bg-card/45 hover:bg-muted p-2 text-left transition disabled:opacity-55">
                  <PlatformIcon type={platform.type} />
                  <span className="block text-xs font-semibold truncate">{platform.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter><Button type="button" onClick={() => props.onOpenChange(false)}>Done</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function MonitorDialog({ open, onOpenChange, status, stats, onActivity, t }: { open: boolean; onOpenChange: (open: boolean) => void; status: string; stats: StreamStats | null; onActivity: () => void; t: (key: string, fallback?: string) => string }) {
  const elapsed = stats?.started_at ? Math.max(0, Math.floor((Date.now() - new Date(stats.started_at).getTime()) / 1000)) : 0
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-card">
        <DialogHeader><DialogTitle>Live Stream Monitor</DialogTitle><DialogDescription>Real-time statistics and runner output from FFmpeg.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t("status", "Status")} value={status} />
            <Stat label={t("streamEditorElapsed", "Elapsed")} value={formatTime(elapsed)} />
          </div>
          {stats?.progress ? <pre className="rounded-lg border bg-muted/20 p-2.5 font-mono text-[10px] whitespace-pre-wrap">{JSON.stringify(stats.progress, null, 2)}</pre> : <div className="text-[10px] text-muted-foreground text-center py-5 border border-dashed rounded-lg">No active stream statistics.</div>}
          {stats?.last_error ? <p className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-xs text-red-600 dark:text-red-400 break-words">{stats.last_error}</p> : null}
          {stats?.last_output?.length ? <div className="rounded-lg border bg-black/95 text-white/90 p-2.5 font-mono text-[9px] max-h-40 overflow-y-auto">{stats.last_output.map((line, index) => <p className="break-all whitespace-pre-wrap" key={`${line}-${index}`}>{line}</p>)}</div> : null}
          <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={onActivity}>{t("streamEditorActivityLink", "Open Activity Log")}</button>
        </div>
        <DialogFooter><Button type="button" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InputBlock({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="space-y-1.5 block"><span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{label}</span><Input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="h-9 text-xs bg-background/50" /></label>
}

function TargetList({ targets, platforms, onRemoveTarget, t }: { targets: string[]; platforms: PlatformTarget[]; onRemoveTarget: (target: string) => void; t: (key: string, fallback?: string) => string }) {
  const byTarget = new Map(platforms.map((platform) => [platform.rtmp_url, platform]))
  return <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">{targets.map((target) => { const platform = byTarget.get(target); return <div key={target} className="flex items-center justify-between gap-2 rounded-lg border bg-background/40 p-2 text-xs"><span className="flex min-w-0 items-center gap-2"><PlatformIcon type={platform?.type || "custom"} /><span className="truncate font-semibold">{platform?.name || t("platformTypeCustom", "Custom")}</span></span><button type="button" onClick={() => onRemoveTarget(target)} className="text-muted-foreground hover:text-red-500 transition"><X className="h-3.5 w-3.5" /></button></div>})}{targets.length === 0 ? <p className="text-[10px] text-muted-foreground text-center py-4 border border-dashed rounded-lg">{t("streamEditorNoTargets")}</p> : null}</div>
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-background/45 p-2 space-y-1"><span className="text-muted-foreground block text-[9px] uppercase font-bold tracking-wider">{label}</span><span className="font-semibold block capitalize text-xs">{value}</span></div>
}
