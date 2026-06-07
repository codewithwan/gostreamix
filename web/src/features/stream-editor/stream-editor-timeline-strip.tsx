import { ArrowLeft, ArrowRight, Copy, Crop, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { EditorVideo, TimelineRange } from "./stream-editor-types"
import { formatTime } from "./stream-editor-utils"

interface TimelineStripProps {
  videos: EditorVideo[]
  activeIndex: number
  selectedVideoID: string
  currentTime: number
  duration: number
  totalDuration: number
  onSelect: (videoID: string, index: number) => void
  onRemove: (index: number) => void
  onMove: (index: number, direction: "left" | "right") => void
  onDuplicate: (index: number) => void
  onDragStart: (value: string) => void
  onDrop: (index: number | null) => void
  t: (key: string, fallback?: string, values?: Record<string, string | number>) => string
}

export function TimelineStrip(props: TimelineStripProps) {
  const ranges = getTimelineRanges(props.videos)
  return (
    <div className="h-36 sm:h-44 md:h-60 border-t bg-card shrink-0 flex flex-col overflow-hidden relative">
      <div className="h-10 border-b px-2 sm:px-4 flex items-center justify-between shrink-0 bg-muted/10 select-none">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold">{props.t("streamEditorQueueTitle")}</span>
          <Badge variant="muted" className="text-[9px] sm:text-[10px] py-0 px-1 sm:px-1.5 font-mono font-normal">{props.videos.length}</Badge>
        </div>
        {props.activeIndex >= 0 && props.activeIndex < props.videos.length ? (
          <div className="flex items-center gap-0.5 sm:gap-1">
            <Button type="button" variant="subtle" size="sm" disabled={props.activeIndex === 0} onClick={() => props.onMove(props.activeIndex, "left")} className="h-7 text-[10px] px-1.5 gap-0.5"><ArrowLeft className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="subtle" size="sm" disabled={props.activeIndex === props.videos.length - 1} onClick={() => props.onMove(props.activeIndex, "right")} className="h-7 text-[10px] px-1.5 gap-0.5"><ArrowRight className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="subtle" size="sm" onClick={() => props.onDuplicate(props.activeIndex)} className="h-7 text-[10px] px-1.5 sm:px-2 gap-1" title="Salin"><Copy className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] px-1.5 sm:px-2 gap-1 border-primary/20 text-primary" title="Crop Borders"><Crop className="h-3.5 w-3.5" /></Button>
            <Button type="button" variant="subtle" size="sm" onClick={() => props.onRemove(props.activeIndex)} className="h-7 text-[10px] px-1.5 sm:px-2 gap-1 text-red-500 hover:text-red-600" title="Hapus"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground font-mono">{props.t("streamEditorTotalDuration", "Total: {duration}", { duration: formatTime(props.totalDuration) })}</div>
        )}
      </div>
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-2 sm:p-4 flex gap-3.5 items-center bg-muted/5 scrollbar-thin" onDragOver={(event) => event.preventDefault()} onDrop={() => props.onDrop(null)}>
        {props.videos.length === 0 ? <div className="w-full flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/80 rounded-lg h-full py-6">{props.t("streamEditorDragHere")}</div> : null}
        {props.videos.map((video, index) => (
          <TimelineClip key={`${video.id}-${index}`} video={video} range={ranges[index]} index={index} active={props.activeIndex === index} selected={props.selectedVideoID === video.id && props.activeIndex !== index} currentTime={props.currentTime} duration={props.duration || video.duration} onSelect={props.onSelect} onDragStart={props.onDragStart} onDrop={props.onDrop} />
        ))}
      </div>
    </div>
  )
}

function TimelineClip(props: { video: EditorVideo; range: TimelineRange; index: number; active: boolean; selected: boolean; currentTime: number; duration: number; onSelect: (videoID: string, index: number) => void; onDragStart: (value: string) => void; onDrop: (index: number) => void }) {
  const width = Math.max(150, Math.min(420, (props.video.duration / 60) * 160))
  return (
    <div draggable onDragStart={() => props.onDragStart(`timeline:${props.index}`)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.stopPropagation(); props.onDrop(props.index) }} onClick={() => props.onSelect(props.video.id, props.index)} style={{ width }} className={cn("shrink-0 h-full border rounded-lg p-1.5 sm:p-2.5 flex flex-col justify-between relative select-none hover:border-primary/50 transition-all duration-200 cursor-pointer overflow-hidden z-0", props.active ? "ring-2 ring-red-500 border-red-500 bg-red-500/[0.03]" : props.selected ? "ring-2 ring-primary/40 border-primary bg-primary/[0.01]" : "border-border bg-card/60")}>
      <div className="flex items-center justify-between text-[8px] text-muted-foreground/60 border-b border-border/40 pb-1 font-mono tracking-tighter shrink-0 select-none z-10">
        <span>{formatTime(props.range.start)}</span><span className="opacity-30">| . . . . |</span><span>{formatTime(props.range.end)}</span>
      </div>
      {props.active ? <div className="absolute top-0 bottom-0 w-px bg-red-500 z-10 shadow-xs pointer-events-none" style={{ left: `${(props.currentTime / (props.duration || 1)) * 100}%` }} /> : null}
      <p className="my-auto min-w-0 z-10 truncate text-[10px] sm:text-xs font-semibold text-foreground">{props.video.filename}</p>
      <div className="flex items-center justify-end text-[8px] sm:text-[9px] text-muted-foreground shrink-0 mt-auto z-10">
        <span className="font-mono font-semibold">{formatTime(props.video.duration)}</span>
      </div>
    </div>
  )
}

function getTimelineRanges(videos: EditorVideo[]): TimelineRange[] {
  let cursor = 0
  return videos.map((video) => {
    const start = cursor
    cursor += video.duration
    return { start, end: cursor }
  })
}
