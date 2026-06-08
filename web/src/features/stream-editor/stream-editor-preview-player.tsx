import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { videoFileURL } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { ClipTransform, EditorVideo } from "./stream-editor-types"
import { formatTime, getTransformStyle } from "./stream-editor-utils"

interface PreviewPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>
  selectedVideo?: EditorVideo
  activeIndex: number
  transform: ClipTransform
  playing: boolean
  muted: boolean
  currentTime: number
  duration: number
  onPlayingChange: (value: boolean) => void
  onMutedChange: (value: boolean) => void
  onCurrentTimeChange: (value: number) => void
  onDurationChange: (value: number) => void
  onEnded: () => void
  t: (key: string, fallback?: string) => string
}

export function PreviewPlayer(props: PreviewPlayerProps) {
  const togglePlayback = () => {
    const video = props.videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      props.onPlayingChange(true)
      return
    }
    video.pause()
    props.onPlayingChange(false)
  }

  const seek = (value: number) => {
    props.onCurrentTimeChange(value)
    if (props.videoRef.current) props.videoRef.current.currentTime = value
  }

  return (
    <div className="w-full max-w-2xl flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {props.t("streamEditorPreview")} {props.activeIndex >= 0 ? `(Timeline Queue #${props.activeIndex + 1})` : ""}
        </span>
      </div>
      <div id="preview-player-box" className="w-full border border-border bg-black/95 group/player flex flex-col select-none rounded-none overflow-hidden">
        <div className="relative w-full aspect-video flex items-center justify-center bg-black overflow-hidden rounded-none">
          {props.selectedVideo ? (
            <video
              key={props.selectedVideo.id}
              ref={props.videoRef}
              src={videoFileURL(props.selectedVideo.source)}
              muted={props.muted}
              playsInline
              onEnded={props.onEnded}
              className="w-full h-full"
              style={getTransformStyle(props.transform)}
              onPlay={() => props.onPlayingChange(true)}
              onPause={() => props.onPlayingChange(false)}
              onLoadedMetadata={(event) => props.onDurationChange(event.currentTarget.duration || props.selectedVideo?.duration || 0)}
              onTimeUpdate={(event) => props.onCurrentTimeChange(event.currentTarget.currentTime)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2 z-10 aspect-video">
              <Play className="h-9 w-9 text-muted-foreground/45 stroke-[1.5]" />
              <span className="text-xs text-muted-foreground/80">{props.t("streamEditorSelectPreview")}</span>
            </div>
          )}
        </div>
        {props.selectedVideo ? (
          <div className="player-controls-container flex flex-col gap-2 p-2.5 bg-card border-t border-border select-none z-20">
            <input type="range" min={0} max={props.duration || props.selectedVideo.duration || 0} step="0.1" value={props.currentTime} onChange={(event) => seek(Number(event.target.value))} className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary hover:h-1.5 transition-all" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button type="button" onClick={togglePlayback} className="text-foreground hover:text-primary transition">{props.playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}</button>
                <button type="button" onClick={() => props.onMutedChange(!props.muted)} className="text-foreground hover:text-primary transition">{props.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
                <span className="text-[10px] font-mono text-muted-foreground">{formatTime(props.currentTime)} / {formatTime(props.duration || props.selectedVideo.duration)}</span>
                
                {/* Wave visualizer */}
                <div className="flex items-end gap-[3px] h-4 px-1 select-none">
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
              <button type="button" onClick={() => document.getElementById("preview-player-box")?.requestFullscreen()} className="text-foreground hover:text-primary transition p-1" title="Fullscreen">
                {document.fullscreenElement ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <FitControls transform={props.transform} onChange={() => undefined} />
    </div>
  )
}

function FitControls({ transform }: { transform: ClipTransform; onChange: (value: ClipTransform) => void }) {
  return <div className={cn("hidden", transform.fit)} />
}
