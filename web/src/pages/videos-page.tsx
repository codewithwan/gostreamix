import { ChevronRight, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DeleteDialog, PreviewDialog, RenameDialog } from "@/features/videos/videos-dialogs"
import { VideoGrid } from "@/features/videos/video-grid"
import { UploadQueue } from "@/features/videos/videos-upload-queue"
import { useVideoLibrary } from "@/features/videos/videos-use-library"
import { VideosToolbar } from "@/features/videos/videos-toolbar"
import { ALL_FOLDERS, ROOT_FOLDER } from "@/features/videos/video-utils"
import { useI18n } from "@/lib/i18n"
import type { Video } from "@/lib/api"

export function VideosPage() {
  const { t } = useI18n()
  const library = useVideoLibrary(t)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("video/"))
    await library.uploadFiles(files)
    event.target.value = ""
  }

  const openPreview = (video: Video) => {
    library.setPreviewVideo(video)
    library.setPreviewTime(0)
    library.setPreviewDuration(video.duration)
    library.setPreviewOpen(true)
  }

  const toggleVideoSelection = (videoID: string) => {
    library.setSelectedVideoIDs((current) => (current.includes(videoID) ? current.filter((id) => id !== videoID) : [...current, videoID]))
  }

  const toggleFolderSelection = (folder: string) => {
    library.setSelectedFolderPaths((current) => (current.includes(folder) ? current.filter((path) => path !== folder) : [...current, folder]))
  }

  const cancelSelection = () => {
    library.setSelectMode(false)
    library.setSelectedVideoIDs([])
    library.setSelectedFolderPaths([])
  }

  const currentFolderLabel = library.selectedFolder === ALL_FOLDERS ? t("videosAllFolders") : library.selectedFolder === ROOT_FOLDER ? t("videosRootFolder") : library.selectedFolder

  return (
    <section className="-mt-2 space-y-4 md:-mt-3">
      <input ref={library.fileInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleFileChange} />
      <VideosToolbar createFolderOpen={library.createFolderOpen} onCreateFolderOpenChange={library.setCreateFolderOpen} newFolderName={library.newFolderName} onNewFolderNameChange={library.setNewFolderName} createFolderBaseLabel={library.createFolderBaseLabel} onCreateFolder={library.createFolder} uploading={library.uploading} onOpenFileDialog={() => library.fileInputRef.current?.click()} onRefresh={() => library.loadVideos({ showLoader: false })} t={t} />
      {library.error ? <p className="text-sm text-danger">{library.error}</p> : null}
      {library.loading ? <p className="text-sm text-muted-foreground">{t("videosLoading")}</p> : null}
      <div className="space-y-3">
        <div className="rounded-md border border-border bg-muted/25 px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
              {library.breadcrumbs.map((crumb, index) => (
                <span key={crumb.path || "root"} className="inline-flex min-w-0 items-center gap-1">
                  {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
                  <button type="button" className="inline-flex max-w-[180px] items-center gap-1 rounded px-1.5 py-1 hover:bg-muted sm:max-w-[260px]" onClick={() => library.setSelectedFolder(crumb.path)}>
                    {index === 0 ? <Home className="h-3.5 w-3.5 shrink-0" /> : null}
                    <span className="truncate">{index === 0 ? t("videosRootFolder") : crumb.label}</span>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("videosCountLabel", "{count} video(s)", { count: library.videos.length })}</span>
              <span className="text-xs text-muted-foreground">{t("videosCurrentUploadFolder", undefined, { folder: currentFolderLabel })}</span>
            </div>
          </div>
        </div>
        {library.selectMode ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
            <span className="text-sm text-muted-foreground">{t("videosSelectedCount", undefined, { count: library.selectedCount })}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={cancelSelection}>{t("videosCancelSelection")}</Button>
              <Button size="sm" variant="danger" onClick={() => library.setDeleteTarget({ kind: "selected" })}>{t("videosDeleteSelected")}</Button>
            </div>
          </div>
        ) : null}
        <VideoGrid loading={library.loading} selectedFolder={library.selectedFolder} parentFolder={library.parent} folders={library.childFolderTiles} filteredVideos={library.visibleVideos} selectMode={library.selectMode} selectedVideoIDs={library.selectedVideoIDs} selectedFolderPaths={library.selectedFolderPaths} brokenThumbnails={library.brokenThumbnails} onOpenParentFolder={library.setSelectedFolder} onOpenFolder={library.setSelectedFolder} onToggleFolderSelection={toggleFolderSelection} onToggleSelection={toggleVideoSelection} onOpenPreview={openPreview} onFolderContextMenu={(event, folder) => { event.preventDefault(); library.setRenameTarget({ kind: "folder", path: folder.path, value: folder.label }) }} onVideoContextMenu={(event, video) => { event.preventDefault(); library.setRenameTarget({ kind: "video", video, value: video.original_name || video.filename }) }} onEmptyContextMenu={(event) => event.preventDefault()} onThumbnailError={(videoID) => library.setBrokenThumbnails((current) => ({ ...current, [videoID]: true }))} t={t} />
      </div>
      <UploadQueue items={library.uploadQueue} uploading={library.uploading} open={library.uploadQueueOpen} onOpenChange={library.setUploadQueueOpen} onClear={() => library.setUploadQueue([])} t={t} />
      <RenameDialog target={library.renameTarget} onChange={library.setRenameTarget} onClose={() => library.setRenameTarget(null)} onSubmit={() => void library.rename()} t={t} />
      <DeleteDialog target={library.deleteTarget} selectedCount={library.selectedCount} onClose={() => library.setDeleteTarget(null)} onSubmit={() => void library.remove()} t={t} />
      <PreviewDialog video={library.previewVideo} open={library.previewOpen} muted={library.previewMuted} playing={library.previewPlaying} currentTime={library.previewTime} duration={library.previewDuration} videoRef={library.previewRef} onOpenChange={(open) => { library.setPreviewOpen(open); if (!open) library.setPreviewPlaying(false) }} onMutedChange={library.setPreviewMuted} onPlayingChange={library.setPreviewPlaying} onTimeChange={library.setPreviewTime} onDurationChange={library.setPreviewDuration} t={t} />
    </section>
  )
}
