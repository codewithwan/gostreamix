import { Maximize2, Pause, Play, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Video } from "@/lib/api"
import type { TranslateFn } from "@/lib/i18n"
import { bytesLabel } from "./video-utils"
import type { DeleteTarget, RenameTarget } from "./videos-types"

export function RenameDialog({ target, onChange, onClose, onSubmit, t }: { target: RenameTarget; onChange: (target: RenameTarget) => void; onClose: () => void; onSubmit: () => void; t: TranslateFn }) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("videosRename", "Rename")}</DialogTitle>
          <DialogDescription>{target?.kind === "folder" ? t("videosRenameFolderDescription", "Rename this folder and update contained videos.") : t("videosRenamePrompt", "Rename video")}</DialogDescription>
        </DialogHeader>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{target?.kind === "folder" ? t("videosFolderNamePlaceholder") : t("videosRenamePrompt", "Rename video")}</span>
          <Input value={target?.value ?? ""} onChange={(event) => onChange(target ? { ...target, value: event.target.value } : null)} autoFocus />
        </label>
        <DialogFooter><Button variant="outline" onClick={onClose}>{t("cancel")}</Button><Button onClick={onSubmit}>{t("update")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteDialog({ target, selectedCount, onClose, onSubmit, t }: { target: DeleteTarget; selectedCount: number; onClose: () => void; onSubmit: () => void; t: TranslateFn }) {
  const message = target?.kind === "video" ? t("videosDeleteConfirm", "Delete video {name}?", { name: target.video.original_name || target.video.filename }) : target?.kind === "folder" ? t("videosDeleteFolderConfirm", "Delete this folder and all videos inside it?") : t("videosDeleteSelectedConfirm", "Delete {count} selected item(s)?", { count: selectedCount })
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("delete")}</DialogTitle><DialogDescription>{message}</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={onClose}>{t("cancel")}</Button><Button variant="danger" onClick={onSubmit}>{t("delete")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PreviewDialog(props: {
  video: Video | null
  open: boolean
  muted: boolean
  playing: boolean
  currentTime: number
  duration: number
  videoRef: React.RefObject<HTMLVideoElement | null>
  onOpenChange: (open: boolean) => void
  onMutedChange: (value: boolean) => void
  onPlayingChange: (value: boolean) => void
  onTimeChange: (value: number) => void
  onDurationChange: (value: number) => void
  t: TranslateFn
}) {
  const togglePlayback = () => {
    const video = props.videoRef.current
    if (!video) return
    video.paused ? video.play() : video.pause()
  }
  const seek = (value: number) => {
    props.onTimeChange(value)
    if (props.videoRef.current) props.videoRef.current.currentTime = value
  }
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1rem)] max-w-5xl flex-col overflow-hidden p-0 sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-11 sm:px-5">
          <DialogTitle className="truncate text-base sm:text-lg">{props.video?.original_name || props.video?.filename}</DialogTitle>
          <DialogDescription className="truncate">{props.video ? `${bytesLabel(props.video.size)} | ${props.video.duration}s` : ""}</DialogDescription>
        </DialogHeader>
        {props.video ? (
          <div className="flex min-h-0 flex-1 flex-col bg-black">
            <button type="button" className="flex min-h-0 flex-1 items-center justify-center bg-black" onClick={togglePlayback}>
              <video ref={props.videoRef} src={`/uploads/${props.video.filename}`} muted={props.muted} playsInline className="max-h-[calc(92dvh-11rem)] w-full bg-black object-contain" onPlay={() => props.onPlayingChange(true)} onPause={() => props.onPlayingChange(false)} onTimeUpdate={(event) => props.onTimeChange(event.currentTarget.currentTime)} onLoadedMetadata={(event) => props.onDurationChange(event.currentTarget.duration)} />
            </button>
            <div className="shrink-0 space-y-3 border-t border-border bg-card p-3 sm:p-4">
              <input type="range" min={0} max={props.duration || 0} step="0.1" value={props.currentTime} onChange={(event) => seek(Number(event.target.value))} className="w-full accent-current" />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 sm:flex sm:items-center">
                  <Button size="sm" type="button" className="min-w-0" onClick={togglePlayback}>{props.playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}<span className="truncate">{props.playing ? props.t("videosPause", "Pause") : props.t("videosPlay", "Play")}</span></Button>
                  <Button size="sm" type="button" variant="outline" className="w-10 px-0" onClick={() => props.onMutedChange(!props.muted)}>{props.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button>
                  <Button size="sm" type="button" variant="outline" className="w-10 px-0" onClick={() => props.videoRef.current?.requestFullscreen()}><Maximize2 className="h-4 w-4" /></Button>
                  
                  {/* Wave visualizer */}
                  <div className="flex items-end gap-[3px] h-4 px-2 select-none">
                    {[...Array(6)].map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "w-[2px] bg-primary rounded-full transition-all duration-150",
                          props.playing ? "animate-wave" : "h-[3px]"
                        )}
                        style={{
                          animationDelay: `${i * 0.15}s`,
                          animationDuration: `${0.6 + (i % 3) * 0.2}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
