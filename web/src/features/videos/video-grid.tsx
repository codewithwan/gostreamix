import { CheckSquare, CirclePlay, Film } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Video } from "@/lib/api"
import type { TranslateFn } from "@/lib/i18n"

import { ALL_FOLDERS, bytesLabel, normalizeFolder } from "./video-utils"

interface VideoGridProps {
  loading: boolean
  selectedFolder: string
  filteredVideos: Video[]
  selectMode: boolean
  selectedVideoIDs: string[]
  brokenThumbnails: Record<string, boolean>
  onStartSelectMode: () => void
  onCancelSelectMode: () => void
  onDeleteSelected: () => void
  onToggleSelection: (videoID: string) => void
  onOpenPreview: (video: Video) => void
  onThumbnailError: (videoID: string) => void
  t: TranslateFn
}

export function VideoGrid({
  loading,
  selectedFolder,
  filteredVideos,
  selectMode,
  selectedVideoIDs,
  brokenThumbnails,
  onStartSelectMode,
  onCancelSelectMode,
  onDeleteSelected,
  onToggleSelection,
  onOpenPreview,
  onThumbnailError,
  t,
}: VideoGridProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!selectMode ? (
          <Button variant="outline" size="sm" onClick={onStartSelectMode}>
            <CheckSquare className="h-4 w-4" />
            {t("videosSelectMode")}
          </Button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("videosSelectedCount", undefined, { count: selectedVideoIDs.length })}</span>
            <Button variant="danger" size="sm" onClick={onDeleteSelected} disabled={selectedVideoIDs.length === 0}>
              {t("videosDeleteSelected")}
            </Button>
            <Button variant="outline" size="sm" onClick={onCancelSelectMode}>
              {t("videosCancelSelection")}
            </Button>
          </div>
        )}
        <span className="text-xs text-muted-foreground">{t("videosPreviewHint")}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {!loading && filteredVideos.length === 0 ? (
          <p className="text-sm text-muted-foreground">{selectedFolder === ALL_FOLDERS ? t("videosEmpty") : t("videosFolderEmpty")}</p>
        ) : null}

        {filteredVideos.map((video) => {
          const thumbnailURL = video.thumbnail ? `/thumbnails/${video.thumbnail}` : ""
          const showThumbnailImage = thumbnailURL && !brokenThumbnails[video.id]
          const isSelected = selectedVideoIDs.includes(video.id)
          const folderName = normalizeFolder(video.folder || "")

          return (
            <Card key={video.id} className={isSelected ? "ring-2 ring-primary/60" : ""}>
              <CardHeader>
                <CardTitle className="truncate text-base">{video.original_name || video.filename}</CardTitle>
                <CardDescription>
                  {bytesLabel(video.size)} | {video.duration}s{folderName ? ` | ${folderName}` : ""}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
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
