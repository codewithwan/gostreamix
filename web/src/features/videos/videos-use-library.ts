import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { copyVideo, deleteVideo, getVideos, MAX_VIDEO_UPLOAD_BYTES, moveVideo, renameVideo, uploadVideoWithProgress, type Video } from "@/lib/api"
import type { TranslateFn } from "@/lib/i18n"
import { ALL_FOLDERS, breadcrumbFolders, childFolders, normalizeFolder, parentFolder, ROOT_FOLDER } from "./video-utils"
import type { DeleteTarget, RenameTarget, UploadQueueItem } from "./videos-types"

export function useVideoLibrary(t: TranslateFn) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewRef = useRef<HTMLVideoElement | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [selectedFolder, setSelectedFolder] = useState(ROOT_FOLDER)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [brokenThumbnails, setBrokenThumbnails] = useState<Record<string, boolean>>({})
  const [selectMode, setSelectMode] = useState(false)
  const [selectedVideoIDs, setSelectedVideoIDs] = useState<string[]>([])
  const [selectedFolderPaths, setSelectedFolderPaths] = useState<string[]>([])
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([])
  const [uploadQueueOpen, setUploadQueueOpen] = useState(true)
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewMuted, setPreviewMuted] = useState(false)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [previewTime, setPreviewTime] = useState(0)
  const [previewDuration, setPreviewDuration] = useState(0)
  const [renameTarget, setRenameTarget] = useState<RenameTarget>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)

  useEffect(() => {
    const saved = window.localStorage.getItem("gostreamix-video-folders")
    if (!saved) return
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed)) setFolders(parsed.map((folder) => normalizeFolder(String(folder))).filter(Boolean))
    } catch {
      // Local folder hints are optional.
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem("gostreamix-video-folders", JSON.stringify(folders))
  }, [folders])

  const loadVideos = async ({ showLoader }: { showLoader: boolean }) => {
    if (showLoader) setLoading(true)
    setError("")
    try {
      setVideos((await getVideos()) || [])
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("videosLoadFailed")
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadVideos({ showLoader: true })
  }, [])

  const folderOptions = useMemo(() => {
    const fromVideos = videos.map((video) => normalizeFolder(video.folder || "")).filter(Boolean)
    return [ALL_FOLDERS, ROOT_FOLDER, ...Array.from(new Set([...fromVideos, ...folders])).sort((a, b) => a.localeCompare(b))]
  }, [videos, folders])

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { [ALL_FOLDERS]: videos.length, [ROOT_FOLDER]: 0 }
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

  const visibleVideos = useMemo(() => {
    if (selectedFolder === ALL_FOLDERS) return videos
    if (selectedFolder === ROOT_FOLDER) return videos.filter((video) => normalizeFolder(video.folder || "") === "")
    return videos.filter((video) => normalizeFolder(video.folder || "") === selectedFolder)
  }, [selectedFolder, videos])

  const currentFolder = selectedFolder === ALL_FOLDERS ? ROOT_FOLDER : selectedFolder
  const childFolderTiles = childFolders(folderOptions, currentFolder, folderCounts)
  const breadcrumbs = breadcrumbFolders(currentFolder)
  const parent = selectedFolder !== ALL_FOLDERS && currentFolder !== ROOT_FOLDER ? parentFolder(currentFolder) : null
  const selectedCount = selectedVideoIDs.length + selectedFolderPaths.length
  const createFolderBaseLabel = currentFolder === ROOT_FOLDER ? t("videosRootFolder") : currentFolder

  const uploadFiles = async (files: File[], folder = currentFolder) => {
    if (files.length === 0) return
    const tooLarge = files.find((file) => file.size > MAX_VIDEO_UPLOAD_BYTES)
    if (tooLarge) return toast.error(t("videosUploadTooLarge", "{name} is larger than the 2 GB upload limit", { name: tooLarge.name }))
    setUploading(true)
    setUploadQueueOpen(true)
    setUploadQueue(files.map((file) => ({ id: `${file.name}-${file.size}-${file.lastModified}`, name: file.name, progress: 0, status: "queued" })))
    try {
      for (const file of files) {
        const id = `${file.name}-${file.size}-${file.lastModified}`
        setUploadQueue((items) => updateUploadItem(items, id, { status: "uploading", progress: 1 }))
        await uploadVideoWithProgress(file, normalizeFolder(folder), (progress) => setUploadQueue((items) => updateUploadItem(items, id, { progress })))
        setUploadQueue((items) => updateUploadItem(items, id, { status: "done", progress: 100 }))
      }
      await loadVideos({ showLoader: false })
      toast.success(t("videosUploadSuccess", "Uploaded {count} video(s)", { count: files.length }))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("videosUploadFailed")
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  const createFolder = () => {
    const folderName = normalizeFolder(newFolderName)
    if (!folderName) return
    const nextPath = normalizeFolder(currentFolder ? `${currentFolder}/${folderName}` : folderName)
    setFolders((current) => Array.from(new Set([...current, nextPath])).sort((a, b) => a.localeCompare(b)))
    setSelectedFolder(nextPath)
    setNewFolderName("")
    setCreateFolderOpen(false)
  }

  const rename = async () => {
    if (!renameTarget) return
    const value = renameTarget.value.trim()
    if (!value) return
    if (renameTarget.kind === "video") await renameVideo(renameTarget.video.id, value)
    setRenameTarget(null)
    await loadVideos({ showLoader: false })
    toast.success(t("videosRenameSuccess", "Video renamed"))
  }

  const remove = async () => {
    if (!deleteTarget) return
    if (deleteTarget.kind === "video") await deleteVideo(deleteTarget.video.id)
    if (deleteTarget.kind === "selected") for (const id of selectedVideoIDs) await deleteVideo(id)
    if (deleteTarget.kind === "folder") for (const video of videos.filter((item) => normalizeFolder(item.folder || "").startsWith(deleteTarget.path))) await deleteVideo(video.id)
    setDeleteTarget(null)
    setSelectedVideoIDs([])
    setSelectedFolderPaths([])
    await loadVideos({ showLoader: false })
    toast.success(t("videosDeleteSuccess"))
  }

  return { fileInputRef, previewRef, videos, selectedFolder, setSelectedFolder, loading, uploading, error, brokenThumbnails, setBrokenThumbnails, selectMode, setSelectMode, selectedVideoIDs, setSelectedVideoIDs, selectedFolderPaths, setSelectedFolderPaths, createFolderOpen, setCreateFolderOpen, newFolderName, setNewFolderName, uploadQueue, setUploadQueue, uploadQueueOpen, setUploadQueueOpen, previewVideo, setPreviewVideo, previewOpen, setPreviewOpen, previewMuted, setPreviewMuted, previewPlaying, setPreviewPlaying, previewTime, setPreviewTime, previewDuration, setPreviewDuration, renameTarget, setRenameTarget, deleteTarget, setDeleteTarget, visibleVideos, childFolderTiles, breadcrumbs, parent, selectedCount, createFolderBaseLabel, loadVideos, uploadFiles, createFolder, rename, remove, moveVideo, copyVideo }
}

function updateUploadItem(items: UploadQueueItem[], id: string, patch: Partial<UploadQueueItem>) {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item))
}
