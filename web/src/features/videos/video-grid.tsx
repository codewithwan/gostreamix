import { CirclePlay, Film, Folder, FolderUp } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Video } from "@/lib/api"
import type { TranslateFn } from "@/lib/i18n"

import { ALL_FOLDERS, bytesLabel, normalizeFolder, type FolderTile } from "./video-utils"

interface VideoGridProps {
  loading: boolean
  selectedFolder: string
  parentFolder: string | null
  folders: FolderTile[]
  filteredVideos: Video[]
  selectMode: boolean
  selectedVideoIDs: string[]
  selectedFolderPaths: string[]
  brokenThumbnails: Record<string, boolean>
  onStartSelectMode: () => void
  onCancelSelectMode: () => void
  onDeleteSelected: () => void
  onOpenParentFolder: (folder: string) => void
  onOpenFolder: (folder: string) => void
  onFolderContextMenu: (event: React.MouseEvent, folder: FolderTile) => void
  onToggleFolderSelection: (folder: string) => void
  onToggleSelection: (videoID: string) => void
  onOpenPreview: (video: Video) => void
  onVideoContextMenu: (event: React.MouseEvent, video: Video) => void
  onEmptyContextMenu: (event: React.MouseEvent) => void
  onThumbnailError: (videoID: string) => void
  t: TranslateFn
}

export function VideoGrid({
  loading,
  selectedFolder,
  parentFolder,
  folders,
  filteredVideos,
  selectMode,
  selectedVideoIDs,
  selectedFolderPaths,
  brokenThumbnails,
  onStartSelectMode: _onStartSelectMode,
  onCancelSelectMode: _onCancelSelectMode,
  onDeleteSelected: _onDeleteSelected,
  onOpenParentFolder,
  onOpenFolder,
  onFolderContextMenu,
  onToggleFolderSelection,
  onToggleSelection,
  onOpenPreview,
  onVideoContextMenu,
  onEmptyContextMenu,
  onThumbnailError,
  t,
}: VideoGridProps) {
  return (
    <div className="space-y-3">
      <div className="grid min-h-56 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8" onContextMenu={onEmptyContextMenu}>
        {!loading && parentFolder === null && folders.length === 0 && filteredVideos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{selectedFolder === ALL_FOLDERS ? t("videosEmpty") : t("videosFolderEmpty")}</p>
        ) : null}

        {!selectMode && parentFolder !== null ? (
          <Card className="h-fit self-start">
            <CardHeader className="p-2.5 pb-1.5">
              <CardTitle className="truncate text-xs">{t("videosBackFolder", "Back")}</CardTitle>
              <CardDescription className="truncate text-[11px]">{t("videosParentFolder", "Parent folder")}</CardDescription>
            </CardHeader>
            <CardContent className="p-2.5 pt-0">
              <button
                type="button"
                className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md border border-border bg-muted/50 text-xs font-medium transition-colors hover:bg-muted"
                onClick={() => onOpenParentFolder(parentFolder)}
              >
                <FolderUp className="h-7 w-7" />
                <span>{t("videosBackFolder", "Back")}</span>
              </button>
            </CardContent>
          </Card>
        ) : null}

        {folders.map((folder) => {
          const isSelected = selectedFolderPaths.includes(folder.path)
          return (
              <Card
                key={folder.path}
                className={`h-fit self-start ${isSelected ? "ring-2 ring-primary/60" : ""}`}
                onContextMenu={(event) => {
                  event.stopPropagation()
                  onFolderContextMenu(event, folder)
                }}
              >
                <CardHeader className="p-2.5 pb-1.5">
                  <CardTitle className="truncate text-xs">{folder.label}</CardTitle>
                  <CardDescription className="truncate text-[11px]">
                    {t("videosFolderTileMeta", "{count} video(s)", { count: folder.videoCount })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2.5 pt-0">
                  <button
                    type="button"
                    className="relative flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-md border border-border bg-muted/50 text-xs font-medium transition-colors hover:bg-muted"
                    onClick={() => {
                      if (selectMode) {
                        onToggleFolderSelection(folder.path)
                      } else {
                        onOpenFolder(folder.path)
                      }
                    }}
                  >
                    <Folder className="h-7 w-7" />
                    <span className="max-w-full truncate px-2">{folder.label}</span>
                    {selectMode ? (
                      <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                        {isSelected ? t("videosSelectedLabel") : t("videosSelectLabel")}
                      </span>
                    ) : null}
                  </button>
                </CardContent>
              </Card>
          )
        })}

        {filteredVideos.map((video) => {
          const thumbnailURL = video.thumbnail ? `/thumbnails/${video.thumbnail}` : ""
          const showThumbnailImage = thumbnailURL && !brokenThumbnails[video.id]
          const isSelected = selectedVideoIDs.includes(video.id)
          const folderName = normalizeFolder(video.folder || "")

          return (
            <Card
              key={video.id}
              className={`h-fit self-start ${isSelected ? "ring-2 ring-primary/60" : ""}`}
              onContextMenu={(event) => {
                event.stopPropagation()
                onVideoContextMenu(event, video)
              }}
            >
              <CardHeader className="p-2.5 pb-1.5">
                <CardTitle className="truncate text-xs">{video.original_name || video.filename}</CardTitle>
                <CardDescription className="truncate text-[11px]">
                  {bytesLabel(video.size)} | {video.duration}s{folderName ? ` | ${folderName}` : ""}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2 p-2.5 pt-0">
                <button
                  type="button"
                  className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-md border border-border bg-muted/60 text-left"
                  onClick={() => {
                    if (selectMode) {
                      onToggleSelection(video.id)
                    } else {
                      onOpenPreview(video)
                    }
                  }}
                >
                  {showThumbnailImage ? (
                    <img
                      src={thumbnailURL}
                      alt={video.original_name || video.filename}
                      className="h-full w-full object-cover"
                      onError={() => onThumbnailError(video.id)}
                    />
                  ) : (
                    <>
                      <video src={`/uploads/${video.filename}`} preload="metadata" muted playsInline className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white">
                        <span className="inline-flex items-center gap-1 rounded bg-black/40 px-2 py-1">
                          <Film className="h-3.5 w-3.5" />
                          {t("videosNoThumbnail")}
                        </span>
                      </div>
                    </>
                  )}

                  {!selectMode ? (
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded bg-black/55 px-2 py-1 text-xs text-white">
                      <CirclePlay className="h-3.5 w-3.5" />
                      {t("videosPreview")}
                    </span>
                  ) : (
                    <span className="absolute left-2 top-2 rounded bg-black/55 px-2 py-1 text-xs text-white">
                      {isSelected ? t("videosSelectedLabel") : t("videosSelectLabel")}
                    </span>
                  )}
                </button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
