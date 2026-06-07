import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PlatformIcon } from "@/features/platforms/platform-icon"
import type { PlatformTarget } from "./stream-editor-types"
import { OUTPUT_PROFILES } from "./stream-editor-utils"

interface ProgramSaveDialogProps {
  bitrate: number
  fps: number
  name: string
  onBitrateChange: (value: number) => void
  onFpsChange: (value: number) => void
  onNameChange: (value: string) => void
  onOpenChange: (open: boolean) => void
  onResolutionChange: (value: string) => void
  onSave: () => void
  onSetTargets: (targets: string[]) => void
  open: boolean
  platforms: PlatformTarget[]
  resolution: string
  saving: boolean
  targets: string[]
  t: (key: string, fallback?: string) => string
}

export function ProgramSaveDialog(props: ProgramSaveDialogProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const selected = new Set(props.targets)

  const toggleTarget = (target: string) => {
    props.onSetTargets(selected.has(target) ? props.targets.filter((item) => item !== target) : [...props.targets, target])
  }

  const save = () => {
    props.onSave()
    props.onOpenChange(false)
  }

  return (
    <Dialog open={props.open} onOpenChange={(open) => { props.onOpenChange(open); if (!open) setStep(1) }}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{step === 1 ? props.t("streamEditorIdentityTitle") : props.t("streamEditorTargetsTitle")}</DialogTitle>
          <DialogDescription>{step === 1 ? props.t("streamEditorIdentityDescription") : props.t("streamEditorTargetsDescription")}</DialogDescription>
        </DialogHeader>
        {step === 1 ? <IdentityStep {...props} /> : (
          <div className="grid gap-2 py-2">
            {props.platforms.map((platform) => (
              <button key={platform.id} type="button" onClick={() => toggleTarget(platform.rtmp_url)} className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition ${selected.has(platform.rtmp_url) ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                <PlatformIcon type={platform.type} />
                <span className="min-w-0 flex-1 truncate font-medium">{platform.name}</span>
              </button>
            ))}
            {props.platforms.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">{props.t("streamEditorNoTargets")}</p> : null}
          </div>
        )}
        <DialogFooter>
          {step === 2 ? <Button type="button" variant="outline" onClick={() => setStep(1)}>{props.t("back", "Back")}</Button> : null}
          {step === 1 ? <Button type="button" onClick={() => setStep(2)}>{props.t("next", "Next")}</Button> : <Button type="button" disabled={props.saving} onClick={save}>{props.saving ? props.t("streamEditorSavingButton") : props.t("streamEditorSaveDraftButton")}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function IdentityStep(props: ProgramSaveDialogProps) {
  return (
    <div className="space-y-4 py-2">
      <label className="block space-y-1.5"><span className="text-xs font-medium">{props.t("streamEditorNamePlaceholder")}</span><Input value={props.name} onChange={(event) => props.onNameChange(event.target.value)} /></label>
      <div className="grid grid-cols-3 gap-1.5">
        {OUTPUT_PROFILES.map((profile) => (
          <Button key={profile.id} type="button" variant={props.resolution === profile.resolution && props.bitrate === profile.bitrate && props.fps === profile.fps ? "default" : "outline"} size="sm" onClick={() => { props.onResolutionChange(profile.resolution); props.onBitrateChange(profile.bitrate); props.onFpsChange(profile.fps) }} className="h-8 text-[10px] px-1">{profile.label}</Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input type="number" value={props.bitrate} onChange={(event) => props.onBitrateChange(Number(event.target.value))} placeholder={props.t("streamEditorBitratePlaceholder")} />
        <Input type="number" value={props.fps} onChange={(event) => props.onFpsChange(Number(event.target.value))} placeholder={props.t("streamEditorFpsPlaceholder")} />
      </div>
      <Input value={props.resolution} onChange={(event) => props.onResolutionChange(event.target.value)} placeholder={props.t("streamEditorResolutionPlaceholder")} />
    </div>
  )
}
