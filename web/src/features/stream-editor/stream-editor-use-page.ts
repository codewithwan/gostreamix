import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { applyProgram, getWorkspace, type StreamStats } from "@/lib/api"
import type { ClipTransforms, EditorVideo, PlatformTarget } from "./stream-editor-types"
import { DEFAULT_TRANSFORM, reorderItems } from "./stream-editor-utils"
import { useStreamStatus } from "./stream-editor-use-status"

interface UseStreamEditorOptions {
  streamID: string
  t: (key: string, fallback?: string, values?: Record<string, string | number>) => string
}

export function useStreamEditor({ streamID, t }: UseStreamEditorOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState("")
  const [name, setName] = useState("")
  const [timeline, setTimeline] = useState<string[]>([])
  const [videos, setVideos] = useState<EditorVideo[]>([])
  const [platforms, setPlatforms] = useState<PlatformTarget[]>([])
  const [targets, setTargets] = useState<string[]>([])
  const [targetDraft, setTargetDraft] = useState("")
  const [search, setSearch] = useState("")
  const [folderFilter, setFolderFilter] = useState("all")
  const [bitrate, setBitrate] = useState(3000)
  const [resolution, setResolution] = useState("1280x720")
  const [fps, setFps] = useState(30)
  const [loop, setLoop] = useState(true)
  const [status, setStatus] = useState("stopped")
  const [stats, setStats] = useState<StreamStats | null>(null)
  const [snapshot, setSnapshot] = useState("")
  const [selectedVideoID, setSelectedVideoID] = useState("")
  const [activeIndex, setActiveIndex] = useState(-1)
  const [transforms, setTransforms] = useState<ClipTransforms>({})
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const workspace = await getWorkspace(streamID)
        if (!alive) return
        const loadedVideos = (workspace.videos || []).map((video) => ({
          id: video.id,
          filename: video.original_name || video.filename,
          source: video.id,
          thumbnail: video.thumbnail || "",
          folder: video.folder?.trim() || "",
          duration: video.duration,
        }))
        const loadedTimeline = workspace.program.video_ids || []
        const loadedTargets = (workspace.program.rtmp_targets || []).filter((target) => target.trim() !== "")
        setName(workspace.stream.name)
        setStatus(workspace.stream.status)
        setTimeline(loadedTimeline)
        setSelectedVideoID(loadedTimeline[0] || "")
        setVideos(loadedVideos)
        setPlatforms(
          (workspace.platforms || [])
            .filter((platform) => platform.rtmp_url.trim() !== "")
            .map((platform) => ({
              id: platform.id,
              name: platform.name,
              type: platform.type,
              rtmp_url: platform.rtmp_url,
              enabled: platform.enabled,
            })),
        )
        setTargets(loadedTargets)
        setBitrate(workspace.program.bitrate)
        setResolution(workspace.program.resolution)
        setFps(workspace.program.fps || workspace.stream.fps || 30)
        setLoop(workspace.stream.loop ?? true)
        setSnapshot(
          JSON.stringify({
            name: workspace.stream.name,
            timeline: loadedTimeline,
            targets: loadedTargets,
            bitrate: workspace.program.bitrate,
            resolution: workspace.program.resolution,
            fps: workspace.program.fps || workspace.stream.fps || 30,
            loop: workspace.stream.loop ?? true,
          }),
        )
      } catch (cause) {
        if (!alive) return
        const message = cause instanceof Error ? cause.message : t("streamEditorLoadFailed")
        setError(message)
        toast.error(message)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [streamID, t])

  useStreamStatus({ streamID, setStats, setStatus })

  const videoByID = useMemo(() => new Map(videos.map((video) => [video.id, video])), [videos])
  const timelineVideos = useMemo(() => timeline.map((id) => videoByID.get(id)).filter((video): video is EditorVideo => Boolean(video)), [timeline, videoByID])
  const folders = useMemo(() => Array.from(new Set(videos.map((video) => video.folder).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [videos])
  const filteredVideos = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase()
    return videos.filter((video) => {
      const folderMatches = folderFilter === "all" || video.folder === folderFilter
      const nameMatches = !needle || video.filename.toLocaleLowerCase().includes(needle)
      return folderMatches && nameMatches
    })
  }, [videos, folderFilter, search])
  const selectedVideo = selectedVideoID ? videoByID.get(selectedVideoID) : undefined
  const totalDuration = timelineVideos.reduce((total, video) => total + video.duration, 0)
  const currentSnapshot = useMemo(() => JSON.stringify({ name, timeline, targets, bitrate, resolution, fps, loop }), [name, timeline, targets, bitrate, resolution, fps, loop])
  const dirty = snapshot !== "" && currentSnapshot !== snapshot
  const isLive = status === "running" || status === "starting"

  const addTarget = useCallback((target: string) => {
    const value = target.trim()
    if (!value) return
    if (!/^rtmps?:\/\//i.test(value)) return toast.error(t("streamEditorInvalidTarget", "Target must start with rtmp:// or rtmps://"))
    if (targets.includes(value)) return toast.error(t("streamEditorDuplicateTarget", "Target already exists"))
    setTargets((current) => [...current, value])
  }, [targets, t])

  const addToTimeline = useCallback((videoID: string) => {
    setTimeline((current) => [...current, videoID])
    setSelectedVideoID((current) => current || videoID)
  }, [])

  const removeFromTimeline = useCallback((index: number) => {
    setTimeline((current) => {
      const removed = current[index]
      const next = current.filter((_, itemIndex) => itemIndex !== index)
      if (selectedVideoID === removed) setSelectedVideoID(next[0] || "")
      return next
    })
    setActiveIndex(-1)
  }, [selectedVideoID])

  const moveClip = useCallback((index: number, direction: "left" | "right") => {
    const toIndex = direction === "left" ? index - 1 : index + 1
    if (toIndex < 0 || toIndex >= timeline.length) return
    setTimeline((current) => reorderItems(current, index, toIndex))
    setActiveIndex(toIndex)
  }, [timeline.length])

  const saveProgram = useCallback(async (applyLive: boolean) => {
    applyLive ? setApplying(true) : setSaving(true)
    setError("")
    try {
      if (timeline.length === 0) throw new Error(t("streamEditorQueueRequired"))
      if (targets.length === 0) throw new Error(t("streamEditorTargetRequired"))
      await applyProgram(streamID, { name, video_ids: timeline, rtmp_targets: targets, bitrate, resolution, fps, loop, apply_live_now: applyLive })
      setSnapshot(currentSnapshot)
      toast.success(t("streamEditorSaveSuccess", "Draft saved"))
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : t("streamEditorApplyFailed")
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
      setApplying(false)
    }
  }, [bitrate, currentSnapshot, fps, loop, name, resolution, streamID, t, targets, timeline])

  return { videoRef, loading, saving, applying, error, setError, name, setName, timeline, setTimeline, videos, platforms, targets, setTargets, targetDraft, setTargetDraft, search, setSearch, folderFilter, setFolderFilter, bitrate, setBitrate, resolution, setResolution, fps, setFps, loop, setLoop, status, stats, selectedVideoID, setSelectedVideoID, activeIndex, setActiveIndex, transforms, setTransforms, playing, setPlaying, muted, setMuted, currentTime, setCurrentTime, duration, setDuration, videoByID, timelineVideos, folders, filteredVideos, selectedVideo, totalDuration, dirty, isLive, addTarget, addToTimeline, removeFromTimeline, moveClip, saveProgram, defaultTransform: DEFAULT_TRANSFORM }
}
