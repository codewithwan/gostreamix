import { Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { thumbnailFileURL, videoFileURL } from "@/lib/api"
import type { EditorVideo } from "./stream-editor-types"
import { formatTime } from "./stream-editor-utils"

interface MediaLibraryPanelProps {
  videos: EditorVideo[]
  folders: string[]
  search: string
  folderFilter: string
  onSearchChange: (value: string) => void
  onFolderFilterChange: (value: string) => void
  onAddVideo: (videoID: string) => void
  onDragStart: (value: string) => void
  t: (key: string, fallback?: string) => string
}

export function MediaLibraryPanel(props: MediaLibraryPanelProps) {
  return (
    <aside className="w-full lg:w-80 flex flex-col border-r bg-card/40 shrink-0 overflow-hidden transition-all duration-300">
      <div className="p-3 border-b space-y-2.5 bg-card/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">{props.t("streamEditorLibrary")}</h3>
          <Badge variant="muted" className="text-[10px] px-1.5 py-0 font-normal">{props.videos.length} {props.t("videos", "Videos")}</Badge>
        </div>
        <Input value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} placeholder={props.t("streamEditorLibrarySearch", "Search videos...")} className="h-8 text-xs bg-background/60" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase font-bold shrink-0">{props.t("streamEditorFolderFilter", "Folder")}</span>
          <select value={props.folderFilter} onChange={(event) => props.onFolderFilterChange(event.target.value)} className="h-7 w-full rounded-md border border-input bg-background/50 px-2 py-0 text-xs focus:ring-1 focus:ring-primary/20">
            <option value="all">{props.t("streamEditorAllFolders", "All folders")}</option>
            <option value="">{props.t("streamEditorRootFolder", "Root")}</option>
            {props.folders.map((folder) => <option value={folder} key={folder}>{folder}</option>)}
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin">
        {props.videos.length === 0 ? <p className="text-center text-xs text-muted-foreground py-10">{props.t("streamEditorNoVideos")}</p> : null}
        {props.videos.map((video) => (
          <button draggable type="button" key={video.id} onDragStart={() => props.onDragStart(`library:${video.id}`)} onClick={() => props.onAddVideo(video.id)} className="group w-full text-left flex gap-2 p-2 rounded-lg border border-border/70 bg-card/70 hover:border-primary/40 hover:bg-card hover:shadow-xs transition duration-200 cursor-pointer">
            <span className="relative flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/60">
              {video.thumbnail ? (
                <img src={thumbnailFileURL(video.thumbnail)} alt={video.filename} className="h-full w-full object-cover" />
              ) : (
                <video src={videoFileURL(video.source)} preload="metadata" muted playsInline className="h-full w-full object-cover" />
              )}
              <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1 py-0.5 font-mono text-[8px] text-white">{formatTime(video.duration)}</span>
            </span>
            <span className="flex min-w-0 flex-1 flex-col justify-between gap-1">
              <span className="flex items-start justify-between gap-2 min-w-0">
                <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground group-hover:text-primary transition duration-150">{video.filename}</span>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-muted text-[9px] text-muted-foreground font-mono max-w-full truncate">{video.folder || props.t("streamEditorRootFolder", "Root")}</span>
                </span>
                <Plus className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary group-hover:scale-110 transition duration-150 shrink-0 mt-0.5" />
              </span>
              <span className="text-[10px] text-muted-foreground">{props.t("streamEditorAddToQueue", "Add to queue")}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  )
}
