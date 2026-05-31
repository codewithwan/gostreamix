import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, CirclePlay, Copy, GripHorizontal, Maximize2, Pause, Play, Plus, Trash2, Volume2, VolumeX } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { applyProgram, getStreamStats, getWorkspace, type StreamStats } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

interface VideoItem {
  id: string
  filename: string
  source: string
  folder: string
  duration: number
}

type StudioTab = "library" | "timeline" | "settings"

type StreamWSMessage = {
  type: string
  payload?: {
    stream_id?: string
    status?: string
    progress?: StreamStats["progress"]
  }
}

const OUTPUT_PROFILES = [
  { id: "720p30", label: "720p30", resolution: "1280x720", bitrate: 2500, fps: 30 },
  { id: "1080p30", label: "1080p30", resolution: "1920x1080", bitrate: 4500, fps: 30 },
  { id: "1080p60", label: "1080p60", resolution: "1920x1080", bitrate: 6000, fps: 60 },
] as const

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

export function StreamEditorPage() {
  const navigate = useNavigate()
  const { streamID = "" } = useParams<{ streamID: string }>()
  const { t } = useI18n()

  const previewRef = useRef<HTMLVideoElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applyingLive, setApplyingLive] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [timelineIDs, setTimelineIDs] = useState<string[]>([])
  const [availableVideos, setAvailableVideos] = useState<VideoItem[]>([])
  const [platformTargets, setPlatformTargets] = useState<Array<{ id: string; name: string; rtmp_url: string; enabled: boolean }>>([])
  const [targets, setTargets] = useState<string[]>([])
  const [newTarget, setNewTarget] = useState("")
  const [libraryQuery, setLibraryQuery] = useState("")
  const [libraryFolder, setLibraryFolder] = useState("all")
  const [bitrate, setBitrate] = useState(3000)
  const [resolution, setResolution] = useState("1280x720")
  const [fps, setFps] = useState(30)
  const [streamStatus, setStreamStatus] = useState("stopped")
  const [streamStats, setStreamStats] = useState<StreamStats | null>(null)
  const [initialSnapshot, setInitialSnapshot] = useState("")
  const [applyConfirmOpen, setApplyConfirmOpen] = useState(false)
  const [activeStudioTab, setActiveStudioTab] = useState<StudioTab>("library")

  const [dragPayload, setDragPayload] = useState("")
  const [previewVideoID, setPreviewVideoID] = useState("")
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [previewMuted, setPreviewMuted] = useState(false)
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0)
  const [previewDuration, setPreviewDuration] = useState(0)

  useEffect(() => {
    let mounted = true

    const loadWorkspace = async () => {
      setLoading(true)
      setError("")

      try {
        const workspace = await getWorkspace(streamID)
        if (!mounted) {
          return
        }

        const videos = workspace.videos.map((video) => ({
          id: video.id,
          filename: video.original_name || video.filename,
          source: video.filename,
          folder: video.folder?.trim() || "",
          duration: video.duration,
        }))
        const timeline = workspace.program.video_ids
        setName(workspace.stream.name)
        setStreamStatus(workspace.stream.status)
        setTimelineIDs(timeline)
        setPreviewVideoID(timeline[0] || "")
        setAvailableVideos(videos)
        setPlatformTargets(
          workspace.platforms
            .filter((platform) => platform.rtmp_url.trim() !== "")
            .map((platform) => ({ id: platform.id, name: platform.name, rtmp_url: platform.rtmp_url, enabled: platform.enabled })),
        )
        setTargets(workspace.program.rtmp_targets.filter((target) => target.trim() !== ""))
        setBitrate(workspace.program.bitrate)
        setResolution(workspace.program.resolution)
        setFps(workspace.program.fps || workspace.stream.fps || 30)
        setInitialSnapshot(
          JSON.stringify({
            name: workspace.stream.name,
            timeline,
            targets: workspace.program.rtmp_targets.filter((target) => target.trim() !== ""),
            bitrate: workspace.program.bitrate,
            resolution: workspace.program.resolution,
            fps: workspace.program.fps || workspace.stream.fps || 30,
          }),
        )
      } catch (err) {
        if (!mounted) {
          return
        }
        const message = err instanceof Error ? err.message : t("streamEditorLoadFailed")
        setError(message)
        toast.error(message)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadWorkspace()

    return () => {
      mounted = false
    }
  }, [streamID, t])

  const videoMap = useMemo(() => {
    const map = new Map<string, VideoItem>()
    for (const item of availableVideos) {
      map.set(item.id, item)
    }
    return map
  }, [availableVideos])

  const timelineVideos = useMemo(() => timelineIDs.map((id) => videoMap.get(id)).filter((item): item is VideoItem => Boolean(item)), [timelineIDs, videoMap])

  const libraryFolders = useMemo(() => {
    const folders = new Set<string>()
    for (const video of availableVideos) {
      if (video.folder) {
        folders.add(video.folder)
      }
    }
    return Array.from(folders).sort((left, right) => left.localeCompare(right))
  }, [availableVideos])

  const libraryVideos = useMemo(() => {
    const query = libraryQuery.trim().toLocaleLowerCase()
    return availableVideos.filter((video) => {
      const folderMatches = libraryFolder === "all" || video.folder === libraryFolder
      const queryMatches = !query || video.filename.toLocaleLowerCase().includes(query)
      return folderMatches && queryMatches
    })
  }, [availableVideos, libraryFolder, libraryQuery])

  const previewVideo = previewVideoID ? videoMap.get(previewVideoID) : undefined
  const totalDuration = timelineVideos.reduce((sum, video) => sum + video.duration, 0)
  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        name,
        timeline: timelineIDs,
        targets,
        bitrate,
        resolution,
        fps,
      }),
    [bitrate, fps, name, resolution, targets, timelineIDs],
  )
  const isDirty = initialSnapshot !== "" && currentSnapshot !== initialSnapshot
  const isLive = streamStatus === "running" || streamStatus === "starting"
  const elapsedSeconds = streamStats?.started_at ? Math.max(0, Math.floor((Date.now() - new Date(streamStats.started_at).getTime()) / 1000)) : 0

  useEffect(() => {
    if (!isDirty) {
      return
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    let cancelled = false

    const loadStats = async () => {
      try {
        const stats = await getStreamStats(streamID)
        if (cancelled) {
          return
        }
        setStreamStats(stats)
        if (stats.status) {
          setStreamStatus(stats.status)
        }
      } catch {
        // Best-effort live panel; workspace load still owns page-level errors.
      }
    }

    void loadStats()
    const interval = window.setInterval(() => void loadStats(), 5000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [streamID])

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`)

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as StreamWSMessage
        if (message.payload?.stream_id !== streamID) {
          return
        }
        if (message.type === "stream_status" && message.payload.status) {
          setStreamStatus(message.payload.status)
          setStreamStats((current) => ({ ...(current || { status: message.payload?.status || "stopped" }), status: message.payload?.status || "stopped" }))
        }
        if (message.type === "stream_progress" && message.payload.progress) {
          setStreamStats((current) => ({ ...(current || { status: "running" }), progress: message.payload?.progress }))
        }
      } catch {
        // Ignore malformed websocket frames; stats polling remains the fallback.
      }
    }

    return () => socket.close()
  }, [streamID])

  const addTarget = (target: string) => {
    const cleanTarget = target.trim()
    if (!cleanTarget) {
      return
    }
    if (!/^rtmps?:\/\//i.test(cleanTarget)) {
      toast.error(t("streamEditorInvalidTarget", "Target must start with rtmp:// or rtmps://"))
      return
    }
    if (targets.includes(cleanTarget)) {
      toast.error(t("streamEditorDuplicateTarget", "Target already exists"))
      return
    }
    setTargets((current) => [...current, cleanTarget])
  }

  const removeTarget = (target: string) => {
    setTargets((current) => current.filter((item) => item !== target))
  }

  const validateTarget = (target: string) => {
    if (/^rtmps?:\/\/[^/]+\/?.+/i.test(target.trim())) {
      toast.success(t("streamEditorTargetValid", "Target format looks valid"))
      return
    }
    toast.error(t("streamEditorInvalidTarget", "Target must start with rtmp:// or rtmps://"))
  }

  const addToTimeline = (videoID: string) => {
    setTimelineIDs((current) => [...current, videoID])
    if (!previewVideoID) {
      setPreviewVideoID(videoID)
    }
  }

  const removeFromTimeline = (index: number) => {
    setTimelineIDs((current) => {
      const removed = current[index]
      const remaining = current.filter((_, itemIndex) => itemIndex !== index)
      if (previewVideoID === removed) {
        setPreviewVideoID(remaining[0] || "")
        setPreviewPlaying(false)
      }
      return remaining
    })
  }

  const moveTimelineItem = (index: number, direction: "left" | "right") => {
    const nextIndex = direction === "left" ? index - 1 : index + 1
    if (nextIndex < 0 || nextIndex >= timelineIDs.length) {
      return
    }

    setTimelineIDs((current) => reorderItems(current, index, nextIndex))
  }

  const moveTimelineItemTo = (index: number, targetIndex: number) => {
    if (index === targetIndex || targetIndex < 0 || targetIndex >= timelineIDs.length) {
      return
    }
    setTimelineIDs((current) => reorderItems(current, index, targetIndex))
  }

  const duplicateTimelineItem = (index: number) => {
    const id = timelineIDs[index]
    if (!id) {
      return
    }
    setTimelineIDs((current) => [...current.slice(0, index + 1), id, ...current.slice(index + 1)])
  }

  const handleTimelineDrop = (targetIndex: number | null) => {
    if (!dragPayload) {
      return
    }

    if (dragPayload.startsWith("library:")) {
      const id = dragPayload.replace("library:", "")
      addToTimeline(id)
      setDragPayload("")
      return
    }

    if (dragPayload.startsWith("timeline:")) {
      const fromIndex = Number(dragPayload.replace("timeline:", ""))
      if (!Number.isFinite(fromIndex) || targetIndex === null || fromIndex === targetIndex) {
        setDragPayload("")
        return
      }
      moveTimelineItemTo(fromIndex, targetIndex)
      setDragPayload("")
    }
  }

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "0:00"
    }
    const minutes = Math.floor(seconds / 60)
    const rest = Math.floor(seconds % 60)
    return `${minutes}:${String(rest).padStart(2, "0")}`
  }

  const maskRTMPTarget = (target: string) => {
    const clean = target.trim()
    const slashIndex = clean.lastIndexOf("/")
    if (slashIndex === -1 || slashIndex >= clean.length - 1) {
      return clean
    }
    return `${clean.slice(0, slashIndex + 1)}******`
  }

  const togglePreviewPlayback = () => {
    const player = previewRef.current
    if (!player) {
      return
    }

    if (player.paused) {
      void player.play()
      setPreviewPlaying(true)
    } else {
      player.pause()
      setPreviewPlaying(false)
    }
  }

  const saveProgram = async (applyLive: boolean) => {
    if (applyLive) {
      setApplyingLive(true)
    } else {
      setSaving(true)
    }
    setError("")

    try {
      if (timelineIDs.length === 0) {
        const message = t("streamEditorQueueRequired")
        setError(message)
        toast.error(message)
        setSaving(false)
        setApplyingLive(false)
        return
      }
      if (targets.length === 0) {
        const message = t("streamEditorTargetRequired")
        setError(message)
        toast.error(message)
        setSaving(false)
        setApplyingLive(false)
        return
      }

      await applyProgram(streamID, {
        name,
        video_ids: timelineIDs,
        rtmp_targets: targets,
        bitrate,
        resolution,
        fps,
        apply_live_now: applyLive,
      })

      setInitialSnapshot(currentSnapshot)
      toast.success(applyLive ? t("streamEditorApplySuccess") : t("streamEditorSaveSuccess", "Draft saved"))
    } catch (err) {
      const message = err instanceof Error ? err.message : t("streamEditorApplyFailed")
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
      setApplyingLive(false)
      setApplyConfirmOpen(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("streamEditorTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("streamEditorDescription")}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/streams")}>
          {t("streamEditorBack")}
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">{t("streamEditorLoading")}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {!loading ? (
        <form className="space-y-4" onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}>
          <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-muted p-1 lg:hidden">
            {(["library", "timeline", "settings"] as StudioTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveStudioTab(tab)}
                className={
                  "rounded px-2 py-2 text-xs font-medium transition " +
                  (activeStudioTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")
                }
              >
                {tab === "library" ? t("streamEditorLibrary") : tab === "timeline" ? t("streamEditorTimeline") : t("streamEditorSettingsTab", "Settings")}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(220px,.8fr)_minmax(360px,1.2fr)_minmax(280px,.9fr)]">
            <Card className={activeStudioTab === "library" ? "block" : "hidden lg:block"}>
              <CardHeader>
                <CardTitle>{t("streamEditorLibrary")}</CardTitle>
                <CardDescription>{t("streamEditorLibraryDescription", "Pick videos for the playlist.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">{t("streamEditorLibrarySearch", "Search videos")}</span>
                  <Input
                    value={libraryQuery}
                    onChange={(event) => setLibraryQuery(event.target.value)}
                    placeholder={t("streamEditorLibrarySearch", "Search videos")}
                    className="h-9"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">{t("streamEditorFolderFilter", "Folder")}</span>
                  <select
                    value={libraryFolder}
                    onChange={(event) => setLibraryFolder(event.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="all">{t("streamEditorAllFolders", "All folders")}</option>
                    <option value="">{t("streamEditorRootFolder", "Root")}</option>
                    {libraryFolders.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid max-h-[68vh] gap-2 overflow-y-auto pr-1">
                  {libraryVideos.length === 0 ? <p className="text-sm text-muted-foreground">{t("streamEditorNoVideos")}</p> : null}

                  {libraryVideos.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      draggable
                      onDragStart={() => setDragPayload(`library:${video.id}`)}
                      onClick={() => addToTimeline(video.id)}
                      className="flex min-h-16 items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{video.filename}</span>
                        <span className="block truncate text-xs text-muted-foreground">{video.folder || t("streamEditorRootFolder", "Root")}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                        {formatTime(video.duration)}
                        <Plus className="h-4 w-4" />
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className={activeStudioTab === "timeline" ? "space-y-4" : "hidden space-y-4 lg:block"}>
              <Card>
                <CardHeader>
                  <CardTitle>{t("streamEditorQueueTitle")}</CardTitle>
                  <CardDescription>
                    {t("streamEditorQueueDescription", undefined, { count: timelineIDs.length })} | {t("streamEditorTotalDuration", "Total {duration}", { duration: formatTime(totalDuration) })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    className="flex min-h-32 gap-2 overflow-x-auto rounded-md border border-dashed border-border bg-muted/30 p-2"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleTimelineDrop(null)}
                  >
                    {timelineVideos.length === 0 ? (
                      <div className="flex w-full items-center justify-center text-sm text-muted-foreground">{t("streamEditorDragHere")}</div>
                    ) : null}

                    {timelineVideos.map((video, index) => (
                      <div
                        key={`${video.id}-${index}`}
                        draggable
                        onDragStart={() => setDragPayload(`timeline:${index}`)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleTimelineDrop(index)}
                        onClick={() => setPreviewVideoID(video.id)}
                        className={
                          "min-w-[190px] rounded-md border border-border bg-card px-2 py-2 " +
                          (previewVideoID === video.id ? "ring-2 ring-primary/50" : "")
                        }
                      >
                        <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <GripHorizontal className="h-3.5 w-3.5" />
                            #{index + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                moveTimelineItem(index, "left")
                              }}
                              className="rounded border border-border p-1 disabled:opacity-40"
                              disabled={index === 0}
                            >
                              <ArrowLeft className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                moveTimelineItem(index, "right")
                              }}
                              className="rounded border border-border p-1 disabled:opacity-40"
                              disabled={index === timelineVideos.length - 1}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                moveTimelineItemTo(index, 0)
                              }}
                              className="rounded border border-border px-1 py-0.5 text-[10px] disabled:opacity-40"
                              disabled={index === 0}
                            >
                              {t("streamEditorMoveTop", "Top")}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                moveTimelineItemTo(index, timelineIDs.length - 1)
                              }}
                              className="rounded border border-border px-1 py-0.5 text-[10px] disabled:opacity-40"
                              disabled={index === timelineIDs.length - 1}
                            >
                              {t("streamEditorMoveEnd", "End")}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                duplicateTimelineItem(index)
                              }}
                              className="rounded border border-border p-1"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                removeFromTimeline(index)
                              }}
                              className="rounded border border-danger/40 p-1 text-danger"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <p className="truncate text-sm font-medium">{video.filename}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground">{formatTime(video.duration)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("streamEditorPreview")}</CardTitle>
                  <CardDescription>{previewVideo?.filename || t("streamEditorSelectPreview")}</CardDescription>
                </CardHeader>
                <CardContent>
                  {previewVideo ? (
                    <>
                      <video
                        key={previewVideo.id}
                        ref={previewRef}
                        src={`/uploads/${previewVideo.source}`}
                        muted={previewMuted}
                        playsInline
                        className="aspect-video w-full rounded-md border border-border bg-black"
                        onPlay={() => setPreviewPlaying(true)}
                        onPause={() => setPreviewPlaying(false)}
                        onLoadedMetadata={(event) => setPreviewDuration(event.currentTarget.duration || previewVideo.duration)}
                        onTimeUpdate={(event) => setPreviewCurrentTime(event.currentTarget.currentTime)}
                      />
                      <div className="mt-3 space-y-2">
                        <input
                          type="range"
                          min={0}
                          max={previewDuration || previewVideo.duration || 0}
                          step="0.1"
                          value={previewCurrentTime}
                          onChange={(event) => {
                            const next = Number(event.target.value)
                            setPreviewCurrentTime(next)
                            if (previewRef.current) {
                              previewRef.current.currentTime = next
                            }
                          }}
                          className="w-full accent-current"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={togglePreviewPlayback}>
                              {previewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              {previewPlaying ? t("streamEditorPause") : t("streamEditorPlay")}
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="w-9 px-0" onClick={() => setPreviewMuted((muted) => !muted)}>
                              {previewMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="w-9 px-0" onClick={() => void previewRef.current?.requestFullscreen()}>
                              <Maximize2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatTime(previewCurrentTime)} / {formatTime(previewDuration || previewVideo.duration)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex aspect-video items-center justify-center rounded-md border border-border bg-muted/30 text-sm text-muted-foreground">
                      <CirclePlay className="mr-2 h-4 w-4" />
                      {t("streamEditorSelectPreview")}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className={activeStudioTab === "settings" ? "space-y-4" : "hidden space-y-4 lg:block"}>
              <Card>
                <CardHeader>
                  <CardTitle>{t("streamEditorLivePanelTitle", "Live status")}</CardTitle>
                  <CardDescription>{t("streamEditorLivePanelDescription", "Current runtime state for this stream.")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("status", "Status")}</span>
                    <span className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-medium">{streamStatus}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("streamEditorCurrentPreview", "Selected preview")}</span>
                    <span className="max-w-[180px] truncate text-right text-xs">{previewVideo?.filename || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("streamEditorElapsed", "Elapsed")}</span>
                    <span className="text-xs tabular-nums">{formatTime(elapsedSeconds)}</span>
                  </div>
                  {streamStats?.progress ? (
                    <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/30 p-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">{t("streamEditorProgressFps", "FPS")}</p>
                        <p className="font-medium tabular-nums">{streamStats.progress.FPS ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("streamEditorProgressBitrate", "Bitrate")}</p>
                        <p className="font-medium tabular-nums">{streamStats.progress.Bitrate || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("streamEditorProgressSpeed", "Speed")}</p>
                        <p className="font-medium tabular-nums">{typeof streamStats.progress.Speed === "number" ? `${streamStats.progress.Speed}x` : "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{t("streamEditorProgressDropped", "Dropped")}</p>
                        <p className="font-medium tabular-nums">{streamStats.progress.Drop ?? 0}</p>
                      </div>
                    </div>
                  ) : null}
                  {streamStats?.last_error ? (
                    <div className="rounded-md border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
                      <p className="font-medium">{t("streamEditorLastError", "Last FFmpeg error")}</p>
                      <p className="mt-1 line-clamp-3">{streamStats.last_error}</p>
                    </div>
                  ) : null}
                  {streamStats?.last_output?.length ? (
                    <details className="rounded-md border border-border bg-muted/30 p-2 text-xs">
                      <summary className="cursor-pointer font-medium">{t("streamEditorLastOutput", "Last FFmpeg output")}</summary>
                      <div className="mt-2 max-h-32 space-y-1 overflow-auto font-mono text-[11px] text-muted-foreground">
                        {streamStats.last_output.map((line, index) => (
                          <p key={`${line}-${index}`} className="break-all">
                            {line}
                          </p>
                        ))}
                      </div>
                    </details>
                  ) : null}
                  <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => navigate("/activity")}>
                    {t("streamEditorActivityLink", "Open Activity Log")}
                  </button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("streamEditorIdentityTitle")}</CardTitle>
                  <CardDescription>{t("streamEditorIdentityDescription")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <span className="text-sm font-medium">{t("streamEditorOutputProfiles", "Output profiles")}</span>
                    <div className="grid grid-cols-3 gap-2">
                      {OUTPUT_PROFILES.map((profile) => (
                        <Button
                          key={profile.id}
                          type="button"
                          variant={resolution === profile.resolution && bitrate === profile.bitrate && fps === profile.fps ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            setResolution(profile.resolution)
                            setBitrate(profile.bitrate)
                            setFps(profile.fps)
                          }}
                        >
                          {profile.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">{t("streamEditorNamePlaceholder")}</span>
                    <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("streamEditorNamePlaceholder")} required />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">{t("streamEditorBitratePlaceholder")}</span>
                    <Input
                      type="number"
                      min={500}
                      value={bitrate}
                      onChange={(event) => setBitrate(Number(event.target.value))}
                      placeholder={t("streamEditorBitratePlaceholder")}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">{t("streamEditorResolutionPlaceholder")}</span>
                    <Input value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder={t("streamEditorResolutionPlaceholder")} />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">{t("streamEditorFpsPlaceholder", "FPS")}</span>
                    <Input type="number" min={15} max={120} value={fps} onChange={(event) => setFps(Number(event.target.value))} placeholder="30" />
                  </label>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("streamEditorTargetsTitle")}</CardTitle>
                  <CardDescription>{t("streamEditorTargetsDescription", undefined, { count: targets.length })}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium">{t("streamEditorTargetsPlaceholder")}</span>
                    <div className="flex gap-2">
                      <Input value={newTarget} onChange={(event) => setNewTarget(event.target.value)} placeholder={t("streamEditorTargetsPlaceholder")} />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          addTarget(newTarget)
                          setNewTarget("")
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        {t("add")}
                      </Button>
                    </div>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    {targets.map((target) => (
                      <span key={target} className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs">
                        <span className="truncate">{maskRTMPTarget(target)}</span>
                        <button type="button" onClick={() => validateTarget(target)} className="font-medium text-primary hover:underline">
                          {t("streamEditorTestTarget", "Test")}
                        </button>
                        <button type="button" onClick={() => removeTarget(target)} className="text-muted-foreground hover:text-foreground">
                          <XIcon />
                        </button>
                      </span>
                    ))}
                    {targets.length === 0 ? <p className="text-xs text-muted-foreground">{t("streamEditorNoTargets")}</p> : null}
                  </div>

                  <div className="grid gap-2">
                    {platformTargets.map((platform) => (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => addTarget(platform.rtmp_url)}
                        className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-left"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="block text-sm font-medium">{platform.name}</span>
                            <Badge variant={platform.enabled ? "success" : "muted"}>{platform.enabled ? t("platformsEnabled", "enabled") : t("platformsDisabled", "disabled")}</Badge>
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">{maskRTMPTarget(platform.rtmp_url)}</span>
                        </span>
                        <span className="text-xs font-medium">{t("streamEditorAdd")}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-2">
                <Button type="button" variant="outline" className="w-full" disabled={saving || !isDirty} onClick={() => void saveProgram(false)}>
                  {saving ? t("streamEditorSavingButton", "Saving...") : t("streamEditorSaveDraftButton", "Save draft")}
                </Button>
                <Button type="button" className="w-full" disabled={applyingLive || !isDirty || !isLive} onClick={() => setApplyConfirmOpen(true)}>
                  {applyingLive ? t("streamEditorApplyingButton") : t("streamEditorApplyLiveButton", "Apply live")}
                </Button>
                {!isLive ? <p className="text-xs text-muted-foreground">{t("streamEditorApplyLiveDisabled", "Start the stream before applying live changes.")}</p> : null}
              </div>
            </div>
          </div>
        </form>
      ) : null}

      <Dialog open={applyConfirmOpen} onOpenChange={setApplyConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("streamEditorApplyLiveTitle", "Apply live changes?")}</DialogTitle>
            <DialogDescription>{t("streamEditorApplyLiveDescription", "This reloads the running FFmpeg pipeline with the current draft.")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setApplyConfirmOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" disabled={applyingLive} onClick={() => void saveProgram(true)}>
              {applyingLive ? t("streamEditorApplyingButton") : t("streamEditorApplyLiveButton", "Apply live")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
