import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import { CheckCircle2, ChevronRight, Copy, Home, Maximize2, MoreHorizontal, Pause, Play, Scissors, UploadCloud, Volume2, VolumeX, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { VideoGrid } from "@/features/videos/video-grid"
import { VideosToolbar } from "@/features/videos/videos-toolbar"
import {
  ALL_FOLDERS,
  ROOT_FOLDER,
  breadcrumbFolders,
  bytesLabel,
  childFolders,
  normalizeFolder,
  parentFolder,
  type FolderTile,
} from "@/features/videos/video-utils"
import {
  MAX_VIDEO_UPLOAD_BYTES,
  copyVideo,
  deleteVideo,
  getVideos,
  moveVideo,
  renameVideo,
  uploadVideoWithProgress,
  type Video,
} from "@/lib/api"
import { useI18n } from "@/lib/i18n"

export function VideosPage() {
  const { t } = useI18n()

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewVideoRef = useRef<HTMLVideoElement | null>(null)

  const [videos, setVideos] = useState<Video[]>([])
  const [customFolders, setCustomFolders] = useState<string[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>(ROOT_FOLDER)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [brokenThumbnails, setBrokenThumbnails] = useState<Record<string, boolean>>({})

  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [previewMuted, setPreviewMuted] = useState(false)
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0)
  const [previewDuration, setPreviewDuration] = useState(0)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedVideoIDs, setSelectedVideoIDs] = useState<string[]>([])
  const [selectedFolderPaths, setSelectedFolderPaths] = useState<string[]>([])

  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [uploadQueueOpen, setUploadQueueOpen] = useState(false)
  const [uploadItems, setUploadItems] = useState<
    Array<{ id: string; name: string; progress: number; status: "queued" | "uploading" | "done" | "error"; error?: string }>
  >([])
  const [contextMenu, setContextMenu] = useState<
    | { type: "video"; x: number; y: number; video: Video }
    | { type: "folder"; x: number; y: number; folder: FolderTile }
    | { type: "space"; x: number; y: number }
    | null
  >(null)
  const [clipboard, setClipboard] = useState<
    | { mode: "cut" | "copy"; kind: "video"; video: Video }
    | { mode: "cut" | "copy"; kind: "folder"; path: string }
    | { mode: "cut" | "copy"; kind: "selection"; videoIDs: string[]; folderPaths: string[] }
    | null
  >(null)
  const [renameDialog, setRenameDialog] = useState<{ kind: "video"; video: Video; value: string } | { kind: "folder"; path: string; value: string } | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ kind: "video"; video: Video } | { kind: "selected" } | { kind: "folder"; path: string } | null>(null)

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

  const folderOptions = useMemo(() => {
    const videoFolders = videos
      .map((video) => normalizeFolder(video.folder || ""))
      .filter((folder) => folder !== "")

    const merged = Array.from(new Set([...videoFolders, ...customFolders])).sort((a, b) => a.localeCompare(b))

    return [ALL_FOLDERS, ROOT_FOLDER, ...merged]
  }, [videos, customFolders])

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

  const visibleFolders = useMemo(() => {
    const baseFolder = selectedFolder === ALL_FOLDERS ? ROOT_FOLDER : selectedFolder
    return childFolders(folderOptions, baseFolder, folderCounts)
  }, [folderCounts, folderOptions, selectedFolder])

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
  const breadcrumbs = useMemo(() => breadcrumbFolders(uploadFolder), [uploadFolder])
  const parentFolderPath = selectedFolder !== ALL_FOLDERS && uploadFolder !== ROOT_FOLDER ? parentFolder(uploadFolder) : null
  const allSelectableVideoIDs = filteredVideos.map((video) => video.id)
  const allSelectableFolderPaths = visibleFolders.map((folder) => folder.path)

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

    const oversized = files.find((file) => file.size > MAX_VIDEO_UPLOAD_BYTES)
    if (oversized) {
      toast.error(t("videosUploadTooLarge", "{name} is larger than the 2 GB upload limit", { name: oversized.name }))
      return
    }

    setUploading(true)
    setError("")
    setUploadQueueOpen(true)

    const queueItems = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      progress: 0,
      status: "queued" as const,
    }))
    setUploadItems(queueItems)

    try {
      const cleanFolder = normalizeFolder(folder)
      for (const file of files) {
        const id = `${file.name}-${file.size}-${file.lastModified}`
        setUploadItems((current) => current.map((item) => (item.id === id ? { ...item, status: "uploading", progress: 1 } : item)))
        try {
          await uploadVideoWithProgress(file, cleanFolder, (progress) => {
            setUploadItems((current) => current.map((item) => (item.id === id ? { ...item, progress } : item)))
          })
          setUploadItems((current) => current.map((item) => (item.id === id ? { ...item, status: "done", progress: 100 } : item)))
        } catch (err) {
          const message = err instanceof Error ? err.message : t("videosUploadFailed")
          setUploadItems((current) => current.map((item) => (item.id === id ? { ...item, status: "error", error: message } : item)))
          throw err
        }
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

  const selectedItemCount = selectedVideoIDs.length + selectedFolderPaths.length

  const handleDeleteSelected = async () => {
    if (selectedItemCount === 0) {
      return
    }
    setDeleteDialog({ kind: "selected" })
  }

  const performDeleteSelected = async () => {
    try {
      let successCount = 0
      const deletedIDs = new Set<string>()
      for (const folder of selectedFolderPaths) {
        for (const video of videosInFolder(folder)) {
          if (deletedIDs.has(video.id)) {
            continue
          }
          await deleteVideo(video.id)
          deletedIDs.add(video.id)
          successCount += 1
        }
      }
      for (const videoID of selectedVideoIDs) {
        if (deletedIDs.has(videoID)) {
          continue
        }
        await deleteVideo(videoID)
        deletedIDs.add(videoID)
        successCount += 1
      }

      await loadVideos({ showLoader: false })
      setCustomFolders((current) => current.filter((folder) => !selectedFolderPaths.some((selected) => folder === selected || folder.startsWith(`${selected}/`))))
      setSelectedVideoIDs([])
      setSelectedFolderPaths([])
      setSelectMode(false)
      toast.success(t("videosDeleteSelectedSuccess", "Deleted {count} video(s)", { count: successCount }))
    } catch (err) {
      const message = err instanceof Error ? err.message : t("videosDeleteFailed")
      setError(message)
      toast.error(message)
    }
  }

  const handleDeleteOne = async (video: Video) => {
    setDeleteDialog({ kind: "video", video })
  }

  const performDeleteOne = async (video: Video) => {
    try {
      await deleteVideo(video.id)
      await loadVideos({ showLoader: false })
      setSelectedVideoIDs((current) => current.filter((id) => id !== video.id))
      toast.success(t("videosDeleteSuccess"))
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

  const handleRenameVideo = async (video: Video) => {
    const currentName = video.original_name || video.filename
    setRenameDialog({ kind: "video", video, value: currentName })
  }

  const performRenameVideo = async (video: Video, nextName: string) => {
    if (nextName.trim() === "") {
      return
    }
    try {
      await renameVideo(video.id, nextName.trim())
      await loadVideos({ showLoader: false })
      setRenameDialog(null)
      toast.success(t("videosRenameSuccess", "Video renamed"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("videosRenameFailed", "Failed to rename video"))
    }
  }

  const handleMoveVideo = async (video: Video, folder = uploadFolder) => {
    try {
      await moveVideo(video.id, folder)
      await loadVideos({ showLoader: false })
      toast.success(t("videosMoveSuccess", "Video moved"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("videosMoveFailed", "Failed to move video"))
    }
  }

  const handleCopyVideo = async (video: Video, folder = uploadFolder) => {
    try {
      await copyVideo(video.id, folder)
      await loadVideos({ showLoader: false })
      toast.success(t("videosCopySuccess", "Video copied"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("videosCopyFailed", "Failed to copy video"))
    }
  }

  const handlePaste = async () => {
    if (!clipboard) {
      return
    }
    if (clipboard.kind === "selection") {
      await pasteSelection(clipboard.videoIDs, clipboard.folderPaths, uploadFolder, clipboard.mode)
      setClipboard(null)
      return
    }
    if (clipboard.kind === "folder") {
      await pasteFolder(clipboard.path, uploadFolder, clipboard.mode)
      setClipboard(null)
      return
    }
    if (clipboard.mode === "cut") {
      await handleMoveVideo(clipboard.video, uploadFolder)
    } else {
      await handleCopyVideo(clipboard.video, uploadFolder)
    }
    setClipboard(null)
  }

  const copySelectionToClipboard = (mode: "cut" | "copy") => {
    if (selectedItemCount === 0) {
      return
    }
    setClipboard({
      mode,
      kind: "selection",
      videoIDs: selectedVideoIDs,
      folderPaths: selectedFolderPaths,
    })
    clearSelection()
  }

  const pasteSelection = async (videoIDs: string[], folderPaths: string[], destinationBase: string, mode: "cut" | "copy") => {
    const movedVideoIDs = new Set<string>()
    try {
      for (const path of folderPaths) {
        const affected = videosInFolder(path)
        const destination = folderDestination(path, destinationBase)
        if (destination === path || destination.startsWith(`${path}/`)) {
          continue
        }
        for (const video of affected) {
          const nextFolder = remapFolderPath(video.folder || "", path, destination)
          if (mode === "cut") {
            await moveVideo(video.id, nextFolder)
            movedVideoIDs.add(video.id)
          } else {
            await copyVideo(video.id, nextFolder)
          }
        }
      }

      for (const id of videoIDs) {
        if (movedVideoIDs.has(id)) {
          continue
        }
        if (mode === "cut") {
          await moveVideo(id, destinationBase)
        } else {
          await copyVideo(id, destinationBase)
        }
      }

      await loadVideos({ showLoader: false })
      toast.success(mode === "cut" ? t("videosMoveSuccess", "Video moved") : t("videosCopySuccess", "Video copied"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : mode === "cut" ? t("videosMoveFailed", "Failed to move video") : t("videosCopyFailed", "Failed to copy video"))
    }
  }

  const selectAllVisible = () => {
    setSelectedVideoIDs(allSelectableVideoIDs)
    setSelectedFolderPaths(allSelectableFolderPaths)
    setSelectMode(true)
  }

  const clearSelection = () => {
    setSelectedVideoIDs([])
    setSelectedFolderPaths([])
    setSelectMode(false)
  }

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "0:00"
    }
    const minutes = Math.floor(seconds / 60)
    const rest = Math.floor(seconds % 60)
    return `${minutes}:${String(rest).padStart(2, "0")}`
  }

  const togglePreviewPlayback = () => {
    const player = previewVideoRef.current
    if (!player) {
      return
    }
    if (player.paused) {
      void player.play()
    } else {
      player.pause()
    }
  }

  const videosInFolder = (path: string) => videos.filter((video) => {
    const folder = normalizeFolder(video.folder || "")
    return folder === path || folder.startsWith(`${path}/`)
  })

  const folderDestination = (source: string, destinationBase: string) => {
    const leaf = source.split("/").pop() || source
    return normalizeFolder(destinationBase ? `${destinationBase}/${leaf}` : leaf)
  }

  const remapFolderPath = (folder: string, source: string, destination: string) => {
    const clean = normalizeFolder(folder)
    if (clean === source) {
      return destination
    }
    return normalizeFolder(`${destination}/${clean.slice(source.length + 1)}`)
  }

  const pasteFolder = async (source: string, destinationBase: string, mode: "cut" | "copy") => {
    const destination = folderDestination(source, destinationBase)
    if (destination === source || destination.startsWith(`${source}/`)) {
      toast.error(t("videosMoveFailed", "Failed to move video"))
      return
    }

    const affected = videosInFolder(source)
    try {
      for (const video of affected) {
        const nextFolder = remapFolderPath(video.folder || "", source, destination)
        if (mode === "cut") {
          await moveVideo(video.id, nextFolder)
        } else {
          await copyVideo(video.id, nextFolder)
        }
      }

      setCustomFolders((current) => {
        const mapped = current.map((folder) => {
          const clean = normalizeFolder(folder)
          if (clean === source || clean.startsWith(`${source}/`)) {
            return remapFolderPath(clean, source, destination)
          }
          return clean
        })
        const kept = mode === "cut" ? mapped.filter((folder) => folder !== source && !folder.startsWith(`${source}/`)) : [...current, ...mapped]
        return Array.from(new Set([...kept, destination])).sort((a, b) => a.localeCompare(b))
      })

      if (mode === "cut" && selectedFolder === source) {
        setSelectedFolder(destination)
      }
      await loadVideos({ showLoader: false })
      toast.success(mode === "cut" ? t("videosMoveSuccess", "Video moved") : t("videosCopySuccess", "Video copied"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : mode === "cut" ? t("videosMoveFailed", "Failed to move video") : t("videosCopyFailed", "Failed to copy video"))
    }
  }

  const performRenameFolder = async (path: string, nextName: string) => {
    const cleanName = normalizeFolder(nextName)
    if (!cleanName) {
      return
    }

    const parent = parentFolder(path)
    const destination = normalizeFolder(parent ? `${parent}/${cleanName}` : cleanName)
    try {
      for (const video of videosInFolder(path)) {
        await moveVideo(video.id, remapFolderPath(video.folder || "", path, destination))
      }
      setCustomFolders((current) =>
        Array.from(
          new Set(
            current.map((folder) => {
              const clean = normalizeFolder(folder)
              if (clean === path || clean.startsWith(`${path}/`)) {
                return remapFolderPath(clean, path, destination)
              }
              return clean
            }),
          ),
        ).sort((a, b) => a.localeCompare(b)),
      )
      if (selectedFolder === path || selectedFolder.startsWith(`${path}/`)) {
        setSelectedFolder(remapFolderPath(selectedFolder, path, destination))
      }
      await loadVideos({ showLoader: false })
      setRenameDialog(null)
      toast.success(t("videosRenameSuccess", "Video renamed"))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("videosRenameFailed", "Failed to rename video"))
    }
  }

  const performDeleteFolder = async (path: string) => {
    try {
      for (const video of videosInFolder(path)) {
        await deleteVideo(video.id)
      }
      setCustomFolders((current) => current.filter((folder) => folder !== path && !folder.startsWith(`${path}/`)))
      if (selectedFolder === path || selectedFolder.startsWith(`${path}/`)) {
        setSelectedFolder(parentFolder(path))
      }
      await loadVideos({ showLoader: false })
      toast.success(t("videosDeleteSelectedSuccess", "Deleted {count} video(s)", { count: folderCounts[path] ?? 0 }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("videosDeleteFailed"))
    }
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

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">{t("videosLoading")}</p> : null}

      <div className="space-y-3">
        <div
          className="rounded-md border border-border bg-muted/25 px-3 py-2"
          onContextMenu={(event) => {
            event.preventDefault()
            setContextMenu({ type: "space", x: event.clientX, y: event.clientY })
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.path || "root"} className="inline-flex min-w-0 items-center gap-1">
                  {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
                  <button
                    type="button"
                    className="inline-flex max-w-[180px] items-center gap-1 rounded px-1.5 py-1 hover:bg-muted sm:max-w-[260px]"
                    onClick={() => setSelectedFolder(crumb.path)}
                  >
                    {index === 0 ? <Home className="h-3.5 w-3.5 shrink-0" /> : null}
                    <span className="truncate">{index === 0 ? t("videosRootFolder") : crumb.label}</span>
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {clipboard ? (
                <Button variant="outline" size="sm" onClick={() => void handlePaste()}>
                  {clipboard.mode === "cut" ? <Scissors className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {t("videosPasteHere", "Paste here")}
                </Button>
              ) : null}
              <span className="text-xs text-muted-foreground">{t("videosCountLabel", "{count} video(s)", { count: videos.length })}</span>
              <span className="text-xs text-muted-foreground">{t("videosCurrentUploadFolder", undefined, { folder: uploadFolderLabel })}</span>
            </div>
          </div>
        </div>

        {selectMode ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
            <span className="text-sm text-muted-foreground">{t("videosSelectedCount", undefined, { count: selectedItemCount })}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={selectAllVisible}>
                {t("videosSelectAll", "Select all")}
              </Button>
              <Button size="sm" variant="outline" onClick={clearSelection}>
                {t("videosCancelSelection")}
              </Button>
            </div>
          </div>
        ) : null}

        <VideoGrid
          loading={loading}
          selectedFolder={selectedFolder}
          parentFolder={parentFolderPath}
          folders={visibleFolders}
          filteredVideos={filteredVideos}
          selectMode={selectMode}
          selectedVideoIDs={selectedVideoIDs}
          selectedFolderPaths={selectedFolderPaths}
          brokenThumbnails={brokenThumbnails}
          onStartSelectMode={() => setSelectMode(true)}
          onCancelSelectMode={() => {
            setSelectMode(false)
            setSelectedVideoIDs([])
          }}
          onDeleteSelected={() => void handleDeleteSelected()}
          onOpenParentFolder={setSelectedFolder}
          onOpenFolder={setSelectedFolder}
          onToggleFolderSelection={(folder) => {
            setSelectedFolderPaths((current) => (current.includes(folder) ? current.filter((entry) => entry !== folder) : [...current, folder]))
            setSelectMode(true)
          }}
          onToggleSelection={(videoID) => {
            setSelectedVideoIDs((current) =>
              current.includes(videoID) ? current.filter((entry) => entry !== videoID) : [...current, videoID],
            )
            setSelectMode(true)
          }}
          onOpenPreview={(video) => {
            setSelectedVideo(video)
            setPreviewOpen(true)
          }}
          onVideoContextMenu={(event, video) => {
            event.preventDefault()
            setContextMenu({ type: "video", x: event.clientX, y: event.clientY, video })
          }}
          onFolderContextMenu={(event, folder) => {
            event.preventDefault()
            setContextMenu({ type: "folder", x: event.clientX, y: event.clientY, folder })
          }}
          onEmptyContextMenu={(event) => {
            event.preventDefault()
            setContextMenu({ type: "space", x: event.clientX, y: event.clientY })
          }}
          onThumbnailError={(videoID) => setBrokenThumbnails((current) => ({ ...current, [videoID]: true }))}
          t={t}
        />
      </div>

      {selectedItemCount > 0 ? (
        <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm shadow-lg">
          <span>{t("videosSelectedCount", undefined, { count: selectedItemCount })}</span>
          <Button size="sm" variant="outline" onClick={selectAllVisible}>
            {t("videosSelectAll", "Select all")}
          </Button>
          <Button size="sm" variant="outline" onClick={clearSelection}>
            {t("videosCancelSelection")}
          </Button>
        </div>
      ) : null}

      {contextMenu ? (
        <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} onContextMenu={(event) => event.preventDefault()}>
          <div
            className="absolute w-44 rounded-md border border-border bg-card p-1 text-sm shadow-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(event) => event.stopPropagation()}
          >
            {contextMenu.type === "space" ? (
              <>
                <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { fileInputRef.current?.click(); setContextMenu(null) }}>
                  {t("videosBrowse")}
                </button>
                <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { setCreateFolderOpen(true); setContextMenu(null) }}>
                  {t("videosCreateFolder")}
                </button>
                {selectedItemCount > 0 ? (
                  <>
                    <div className="my-1 border-t border-border" />
                    <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { copySelectionToClipboard("cut"); setContextMenu(null) }}>
                      {t("videosCutSelected", "Cut selected")}
                    </button>
                    <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { copySelectionToClipboard("copy"); setContextMenu(null) }}>
                      {t("videosCopySelected", "Copy selected")}
                    </button>
                    <button className="w-full rounded px-2 py-1.5 text-left text-danger hover:bg-danger/10" onClick={() => { handleDeleteSelected(); setContextMenu(null) }}>
                      {t("videosDeleteSelected")}
                    </button>
                  </>
                ) : null}
                {clipboard ? (
                  <>
                    <div className="my-1 border-t border-border" />
                    <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { void handlePaste(); setContextMenu(null) }}>
                      {t("videosPasteHere", "Paste here")}
                    </button>
                  </>
                ) : null}
              </>
            ) : null}

            {contextMenu.type === "folder" ? (
              <>
                <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { setSelectedFolder(contextMenu.folder.path); setContextMenu(null) }}>
                  {t("open", "Open")}
                </button>
                <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { setRenameDialog({ kind: "folder", path: contextMenu.folder.path, value: contextMenu.folder.label }); setContextMenu(null) }}>
                  {t("videosRename", "Rename")}
                </button>
                <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { setClipboard({ mode: "cut", kind: "folder", path: contextMenu.folder.path }); setContextMenu(null) }}>
                  {t("videosCut", "Cut")}
                </button>
                <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { setClipboard({ mode: "copy", kind: "folder", path: contextMenu.folder.path }); setContextMenu(null) }}>
                  {t("videosCopy", "Copy")}
                </button>
                {clipboard ? (
                  <button
                    className="w-full rounded px-2 py-1.5 text-left hover:bg-muted"
                    onClick={() => {
                      const target = contextMenu.folder.path
                      if (clipboard.kind === "folder") {
                        void pasteFolder(clipboard.path, target, clipboard.mode)
                      } else if (clipboard.kind === "selection") {
                        void pasteSelection(clipboard.videoIDs, clipboard.folderPaths, target, clipboard.mode)
                      } else if (clipboard.mode === "cut") {
                        void handleMoveVideo(clipboard.video, target)
                      } else {
                        void handleCopyVideo(clipboard.video, target)
                      }
                      setClipboard(null)
                      setContextMenu(null)
                    }}
                  >
                    {t("videosPasteHere", "Paste here")}
                  </button>
                ) : null}
                <button
                  className="w-full rounded px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => {
                    setSelectedFolderPaths((current) =>
                      current.includes(contextMenu.folder.path) ? current.filter((path) => path !== contextMenu.folder.path) : [...current, contextMenu.folder.path],
                    )
                    setSelectMode(true)
                    setContextMenu(null)
                  }}
                >
                  {selectedFolderPaths.includes(contextMenu.folder.path) ? t("videosUnselect", "Unselect") : t("videosSelectLabel")}
                </button>
                <button className="w-full rounded px-2 py-1.5 text-left text-danger hover:bg-danger/10" onClick={() => { setDeleteDialog({ kind: "folder", path: contextMenu.folder.path }); setContextMenu(null) }}>
                  {t("delete")}
                </button>
              </>
            ) : null}

            {contextMenu.type === "video" ? (
              <>
                <button
                  className="w-full rounded px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => {
                    setSelectedVideo(contextMenu.video)
                    setPreviewOpen(true)
                    setContextMenu(null)
                  }}
                >
                  {t("videosPreview")}
                </button>
                <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { void handleRenameVideo(contextMenu.video); setContextMenu(null) }}>
                  {t("videosRename", "Rename")}
                </button>
                <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { setClipboard({ mode: "cut", kind: "video", video: contextMenu.video }); setContextMenu(null) }}>
                  {t("videosCut", "Cut")}
                </button>
                <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { setClipboard({ mode: "copy", kind: "video", video: contextMenu.video }); setContextMenu(null) }}>
                  {t("videosCopy", "Copy")}
                </button>
                {clipboard ? (
                  <button className="w-full rounded px-2 py-1.5 text-left hover:bg-muted" onClick={() => { void handlePaste(); setContextMenu(null) }}>
                    {t("videosPasteHere", "Paste here")}
                  </button>
                ) : null}
                <button
                  className="w-full rounded px-2 py-1.5 text-left hover:bg-muted"
                  onClick={() => {
                    setSelectedVideoIDs((current) =>
                      current.includes(contextMenu.video.id) ? current.filter((id) => id !== contextMenu.video.id) : [...current, contextMenu.video.id],
                    )
                    setSelectMode(true)
                    setContextMenu(null)
                  }}
                >
                  {selectedVideoIDs.includes(contextMenu.video.id) ? t("videosUnselect", "Unselect") : t("videosSelectLabel")}
                </button>
                <button
                  className="w-full rounded px-2 py-1.5 text-left text-danger hover:bg-danger/10"
                  onClick={() => {
                    void handleDeleteOne(contextMenu.video)
                    setContextMenu(null)
                  }}
                >
                  {t("delete")}
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {uploadItems.length > 0 ? (
        <div className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] rounded-md border border-border bg-card shadow-lg">
          <div className="flex items-center gap-2 px-3 py-2">
            <button type="button" className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left" onClick={() => setUploadQueueOpen((open) => !open)}>
              <span className="inline-flex min-w-0 items-center gap-2">
                {uploading ? <UploadCloud className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
                <span className="truncate text-sm font-medium">
                  {uploading
                    ? t("videosUploadQueueSummary", "{done}/{total} uploaded", {
                        done: uploadItems.filter((item) => item.status === "done").length,
                        total: uploadItems.length,
                      })
                    : uploadItems.some((item) => item.status === "error")
                      ? t("videosUploadQueueFinishedWithErrors", "{done}/{total} uploaded, {failed} failed", {
                          done: uploadItems.filter((item) => item.status === "done").length,
                          total: uploadItems.length,
                          failed: uploadItems.filter((item) => item.status === "error").length,
                        })
                      : t("videosUploadQueueComplete", "{count} video(s) uploaded", {
                          count: uploadItems.length,
                        })}
                </span>
              </span>
              <MoreHorizontal className="h-4 w-4 shrink-0" />
            </button>
            {!uploading ? (
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-muted"
                aria-label={t("close")}
                onClick={() => setUploadItems([])}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {uploadQueueOpen ? (
            <div className="max-h-72 space-y-2 overflow-auto border-t border-border p-3">
              {uploadItems.map((item) => (
                <div key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate">{item.name}</span>
                    <span className={item.status === "error" ? "text-danger" : item.status === "done" ? "text-emerald-500" : "text-muted-foreground"}>
                      {item.status === "error"
                        ? t("videosUploadStatusFailed", "Failed")
                        : item.status === "done"
                          ? t("videosUploadStatusDone", "Uploaded")
                          : item.status === "queued"
                            ? t("videosUploadStatusQueued", "Queued")
                            : `${item.progress}%`}
                    </span>
                  </div>
                  {item.status === "done" ? (
                    <p className="inline-flex items-center gap-1 text-xs text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("videosUploadItemComplete", "Successfully uploaded")}
                    </p>
                  ) : (
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={item.status === "error" ? "h-full bg-danger" : "h-full bg-primary"} style={{ width: `${item.progress}%` }} />
                    </div>
                  )}
                  {item.error ? <p className="text-xs text-danger">{item.error}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <Dialog open={renameDialog !== null} onOpenChange={(open) => !open && setRenameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("videosRename", "Rename")}</DialogTitle>
            <DialogDescription>
              {renameDialog?.kind === "folder" ? t("videosRenameFolderDescription", "Rename this folder and update contained videos.") : t("videosRenamePrompt", "Rename video")}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameDialog?.value ?? ""}
            onChange={(event) => {
              const value = event.target.value
              setRenameDialog((current) => (current ? { ...current, value } : current))
            }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={() => {
                if (!renameDialog) {
                  return
                }
                if (renameDialog.kind === "video") {
                  void performRenameVideo(renameDialog.video, renameDialog.value)
                } else {
                  void performRenameFolder(renameDialog.path, renameDialog.value)
                }
              }}
            >
              {t("update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog !== null} onOpenChange={(open) => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete")}</DialogTitle>
            <DialogDescription>
              {deleteDialog?.kind === "video"
                ? t("videosDeleteConfirm", "Delete video {name}?", { name: deleteDialog.video.original_name || deleteDialog.video.filename })
                : deleteDialog?.kind === "folder"
                  ? t("videosDeleteFolderConfirm", "Delete this folder and all videos inside it?")
                  : t("videosDeleteSelectedConfirm", "Delete {count} selected item(s)?", { count: selectedItemCount })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!deleteDialog) {
                  return
                }
                if (deleteDialog.kind === "video") {
                  void performDeleteOne(deleteDialog.video)
                } else if (deleteDialog.kind === "folder") {
                  void performDeleteFolder(deleteDialog.path)
                } else {
                  void performDeleteSelected()
                }
                setDeleteDialog(null)
              }}
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open)
          if (!open) {
            setPreviewPlaying(false)
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.original_name || selectedVideo?.filename}</DialogTitle>
            <DialogDescription>{selectedVideo ? `${bytesLabel(selectedVideo.size)} | ${selectedVideo.duration}s` : ""}</DialogDescription>
          </DialogHeader>
          {selectedVideo ? (
            <div className="overflow-hidden rounded-md border border-border bg-black">
              <button type="button" className="block w-full" onClick={togglePreviewPlayback}>
                <video
                  key={selectedVideo.id}
                  ref={previewVideoRef}
                  src={`/uploads/${selectedVideo.filename}`}
                  muted={previewMuted}
                  className="aspect-video w-full bg-black object-contain"
                  onPlay={() => setPreviewPlaying(true)}
                  onPause={() => setPreviewPlaying(false)}
                  onTimeUpdate={(event) => setPreviewCurrentTime(event.currentTarget.currentTime)}
                  onLoadedMetadata={(event) => setPreviewDuration(event.currentTarget.duration)}
                />
              </button>
              <div className="space-y-2 bg-card p-3">
                <input
                  type="range"
                  min={0}
                  max={previewDuration || 0}
                  step="0.1"
                  value={previewCurrentTime}
                  onChange={(event) => {
                    const next = Number(event.target.value)
                    setPreviewCurrentTime(next)
                    if (previewVideoRef.current) {
                      previewVideoRef.current.currentTime = next
                    }
                  }}
                  className="w-full accent-current"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button size="sm" type="button" onClick={togglePreviewPlayback}>
                      {previewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {previewPlaying ? t("videosPause", "Pause") : t("videosPlay", "Play")}
                    </Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => setPreviewMuted((muted) => !muted)}>
                      {previewMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" type="button" variant="outline" onClick={() => void previewVideoRef.current?.requestFullscreen()}>
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(previewCurrentTime)} / {formatTime(previewDuration)}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  )
}
