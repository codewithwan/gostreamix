import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { toast } from "sonner"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FolderExplorer } from "@/features/videos/folder-explorer"
import { VideoGrid } from "@/features/videos/video-grid"
import { VideosSummary } from "@/features/videos/videos-summary"
import { VideosToolbar } from "@/features/videos/videos-toolbar"
import { ALL_FOLDERS, ROOT_FOLDER, bytesLabel, normalizeFolder, toFolderItems } from "@/features/videos/video-utils"
import { deleteVideo, getVideos, uploadVideo, type Video } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

export function VideosPage() {
  const { t } = useI18n()

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [videos, setVideos] = useState<Video[]>([])
  const [customFolders, setCustomFolders] = useState<string[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>(ALL_FOLDERS)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [brokenThumbnails, setBrokenThumbnails] = useState<Record<string, boolean>>({})

  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedVideoIDs, setSelectedVideoIDs] = useState<string[]>([])

  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  useEffect(() => {
    const raw = window.localStorage.getItem("gostreamix-video-folders")
    if (!raw) {
      return
    }

    try {
      const parsed = JSON.parse(raw) as string[]
      if (Array.isArray(parsed)) {
        setCustomFolders(parsed.map((item) => normalizeFolder(String(item))).filter(Boolean))
      }
    } catch {
      // ignore corrupted local cache
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem("gostreamix-video-folders", JSON.stringify(customFolders))
  }, [customFolders])

  const videoCountLabel = useMemo(() => t("videosCountLabel", "{count} video(s)", { count: videos.length }), [t, videos.length])

  const folderOptions = useMemo(() => {
    const videoFolders = videos
      .map((video) => normalizeFolder(video.folder || ""))
      .filter((folder) => folder !== "")

    const merged = Array.from(new Set([...videoFolders, ...customFolders])).sort((a, b) => a.localeCompare(b))

    return [ALL_FOLDERS, ROOT_FOLDER, ...merged]
  }, [videos, customFolders])

  const folderItems = useMemo(() => toFolderItems(folderOptions), [folderOptions])

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {
      [ALL_FOLDERS]: videos.length,
      [ROOT_FOLDER]: 0,
    }

    for (const video of videos) {
      const folder = normalizeFolder(video.folder || "")
      if (!folder) {
        counts[ROOT_FOLDER] = (counts[ROOT_FOLDER] ?? 0) + 1
        continue
      }

      const parts = folder.split("/")
      for (let index = 1; index <= parts.length; index += 1) {
        const path = parts.slice(0, index).join("/")
        counts[path] = (counts[path] ?? 0) + 1
      }
    }

    return counts
  }, [videos])

  const filteredVideos = useMemo(() => {
    if (selectedFolder === ALL_FOLDERS) {
      return videos
    }
    if (selectedFolder === ROOT_FOLDER) {
      return videos.filter((video) => normalizeFolder(video.folder || "") === "")
    }
    return videos.filter((video) => normalizeFolder(video.folder || "") === selectedFolder)
  }, [selectedFolder, videos])

  const uploadFolder = selectedFolder === ALL_FOLDERS ? ROOT_FOLDER : selectedFolder
  const uploadFolderLabel = uploadFolder === ROOT_FOLDER ? t("videosRootFolder") : uploadFolder
  const selectedFolderLabel =
    selectedFolder === ALL_FOLDERS ? t("videosAllFolders") : selectedFolder === ROOT_FOLDER ? t("videosRootFolder") : selectedFolder
  const createFolderBase = selectedFolder === ALL_FOLDERS ? ROOT_FOLDER : selectedFolder
  const createFolderBaseLabel = createFolderBase === ROOT_FOLDER ? t("videosRootFolder") : createFolderBase

  const loadVideos = async ({ showLoader }: { showLoader: boolean }) => {
    if (showLoader) {
      setLoading(true)
    }

    setError("")
    try {
      const data = await getVideos()
      setVideos(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : t("videosLoadFailed")
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadVideos({ showLoader: true })
  }, [])

  const uploadFiles = async (files: File[], folder: string) => {
    if (files.length === 0) {
      return
    }

    setUploading(true)
    setError("")

    try {
      const cleanFolder = normalizeFolder(folder)
      for (const file of files) {
        await uploadVideo(file, cleanFolder)
      }
      await loadVideos({ showLoader: false })
      toast.success(t("videosUploadSuccess", "Uploaded {count} video(s)", { count: files.length }))
    } catch (err) {
      const message = err instanceof Error ? err.message : t("videosUploadFailed")
      setError(message)
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  const handleUploadInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("video/"))
    await uploadFiles(files, uploadFolder)
    event.target.value = ""
  }

  const handleDeleteSelected = async () => {
    if (selectedVideoIDs.length === 0) {
      return
    }

    const confirmed = window.confirm(t("videosDeleteSelectedConfirm", "Delete {count} selected video(s)?", { count: selectedVideoIDs.length }))
    if (!confirmed) {
      return
    }

    try {
      let successCount = 0
      for (const videoID of selectedVideoIDs) {
        await deleteVideo(videoID)
        successCount += 1
      }

      await loadVideos({ showLoader: false })
      setSelectedVideoIDs([])
      setSelectMode(false)
      toast.success(t("videosDeleteSelectedSuccess", "Deleted {count} video(s)", { count: successCount }))
    } catch (err) {
      const message = err instanceof Error ? err.message : t("videosDeleteFailed")
      setError(message)
      toast.error(message)
    }
  }

  const handleCreateFolder = () => {
    const cleanFolderName = normalizeFolder(newFolderName)
    if (!cleanFolderName) {
      return
    }

    const nextFolder = normalizeFolder(createFolderBase ? `${createFolderBase}/${cleanFolderName}` : cleanFolderName)
    if (!nextFolder) {
      return
    }

    setCustomFolders((current) => {
      if (current.includes(nextFolder)) {
        return current
      }
      return [...current, nextFolder].sort((a, b) => a.localeCompare(b))
    })
    setSelectedFolder(nextFolder)
    setNewFolderName("")
    setCreateFolderOpen(false)
  }

  return (
    <section className="space-y-5">
      <input ref={fileInputRef} type="file" accept="video/*" multiple className="hidden" onChange={(event) => void handleUploadInput(event)} />

      <VideosToolbar
        createFolderOpen={createFolderOpen}
        onCreateFolderOpenChange={setCreateFolderOpen}
        newFolderName={newFolderName}
        onNewFolderNameChange={setNewFolderName}
        createFolderBaseLabel={createFolderBaseLabel}
        onCreateFolder={handleCreateFolder}
        uploading={uploading}
        onOpenFileDialog={() => fileInputRef.current?.click()}
        onRefresh={() => void loadVideos({ showLoader: false })}
        t={t}
      />

      <VideosSummary videoCountLabel={videoCountLabel} selectedFolderLabel={selectedFolderLabel} uploadFolderLabel={uploadFolderLabel} t={t} />

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">{t("videosLoading")}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <FolderExplorer
          folderItems={folderItems}
          folderCounts={folderCounts}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
          t={t}
        />

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/25 px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("videosFolder")}</p>
              <p className="truncate text-sm font-medium">{selectedFolderLabel}</p>
            </div>
            <span className="text-xs text-muted-foreground">{t("videosCurrentUploadFolder", undefined, { folder: uploadFolderLabel })}</span>
          </div>

          <VideoGrid
            loading={loading}
            selectedFolder={selectedFolder}
            filteredVideos={filteredVideos}
            selectMode={selectMode}
            selectedVideoIDs={selectedVideoIDs}
            brokenThumbnails={brokenThumbnails}
            onStartSelectMode={() => setSelectMode(true)}
            onCancelSelectMode={() => {
              setSelectMode(false)
              setSelectedVideoIDs([])
            }}
            onDeleteSelected={() => void handleDeleteSelected()}
            onToggleSelection={(videoID) => {
              setSelectedVideoIDs((current) =>
                current.includes(videoID) ? current.filter((entry) => entry !== videoID) : [...current, videoID],
              )
            }}
            onOpenPreview={(video) => {
              setSelectedVideo(video)
              setPreviewOpen(true)
            }}
            onThumbnailError={(videoID) => setBrokenThumbnails((current) => ({ ...current, [videoID]: true }))}
            t={t}
          />
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.original_name || selectedVideo?.filename}</DialogTitle>
            <DialogDescription>{selectedVideo ? `${bytesLabel(selectedVideo.size)} | ${selectedVideo.duration}s` : ""}</DialogDescription>
          </DialogHeader>
          {selectedVideo ? (
            <video key={selectedVideo.id} src={`/uploads/${selectedVideo.filename}`} controls className="w-full rounded-md border border-border bg-black" />
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
