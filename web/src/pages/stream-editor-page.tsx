import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, CirclePlay, GripHorizontal, Pause, Play, Plus, Trash2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { applyProgram, getWorkspace } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

interface VideoItem {
  id: string
  filename: string
  source: string
}

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
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [timelineIDs, setTimelineIDs] = useState<string[]>([])
  const [availableVideos, setAvailableVideos] = useState<VideoItem[]>([])
  const [platformTargets, setPlatformTargets] = useState<Array<{ id: string; name: string; rtmp_url: string }>>([])
  const [targets, setTargets] = useState<string[]>([])
  const [newTarget, setNewTarget] = useState("")
  const [bitrate, setBitrate] = useState(3000)
  const [resolution, setResolution] = useState("1280x720")

  const [dragPayload, setDragPayload] = useState("")
  const [previewVideoID, setPreviewVideoID] = useState("")
  const [previewPlaying, setPreviewPlaying] = useState(false)

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
        }))
        const timeline = workspace.program.video_ids
        setName(workspace.stream.name)
        setTimelineIDs(timeline)
        setPreviewVideoID(timeline[0] || "")
        setAvailableVideos(videos)
        setPlatformTargets(
          workspace.platforms
            .filter((platform) => platform.rtmp_url.trim() !== "")
            .map((platform) => ({ id: platform.id, name: platform.name, rtmp_url: platform.rtmp_url })),
        )
        setTargets(workspace.program.rtmp_targets.filter((target) => target.trim() !== ""))
        setBitrate(workspace.program.bitrate)
        setResolution(workspace.program.resolution)
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

  const libraryVideos = useMemo(
    () => availableVideos.filter((video) => !timelineIDs.includes(video.id)),
    [availableVideos, timelineIDs],
  )

  const previewVideo = previewVideoID ? videoMap.get(previewVideoID) : undefined

  const addTarget = (target: string) => {
    const cleanTarget = target.trim()
    if (!cleanTarget || targets.includes(cleanTarget)) {
      return
    }
    setTargets((current) => [...current, cleanTarget])
  }

  const removeTarget = (target: string) => {
    setTargets((current) => current.filter((item) => item !== target))
  }

  const addToTimeline = (videoID: string) => {
    if (timelineIDs.includes(videoID)) {
      return
    }

    setTimelineIDs((current) => [...current, videoID])
    if (!previewVideoID) {
      setPreviewVideoID(videoID)
    }
  }

  const removeFromTimeline = (videoID: string) => {
    setTimelineIDs((current) => {
      const remaining = current.filter((id) => id !== videoID)
      if (previewVideoID === videoID) {
        setPreviewVideoID(remaining[0] || "")
        setPreviewPlaying(false)
      }
      return remaining
    })
  }

  const moveTimelineItem = (videoID: string, direction: "left" | "right") => {
    const currentIndex = timelineIDs.findIndex((id) => id === videoID)
    if (currentIndex === -1) {
      return
    }

    const nextIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1
    if (nextIndex < 0 || nextIndex >= timelineIDs.length) {
      return
    }

    setTimelineIDs((current) => reorderItems(current, currentIndex, nextIndex))
  }

  const handleTimelineDrop = (targetID: string | null) => {
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
      const draggedID = dragPayload.replace("timeline:", "")
      if (!targetID || draggedID === targetID) {
        setDragPayload("")
        return
      }

      const fromIndex = timelineIDs.findIndex((id) => id === draggedID)
      const toIndex = timelineIDs.findIndex((id) => id === targetID)
      if (fromIndex === -1 || toIndex === -1) {
        setDragPayload("")
        return
      }

      setTimelineIDs((current) => reorderItems(current, fromIndex, toIndex))
      setDragPayload("")
    }
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")

    try {
      if (timelineIDs.length === 0) {
        const message = t("streamEditorQueueRequired")
        setError(message)
        toast.error(message)
        setSaving(false)
        return
      }
      if (targets.length === 0) {
        const message = t("streamEditorTargetRequired")
        setError(message)
        toast.error(message)
        setSaving(false)
        return
      }

      await applyProgram(streamID, {
        name,
        video_ids: timelineIDs,
        rtmp_targets: targets,
        bitrate,
        resolution,
        apply_live_now: true,
      })

      toast.success(t("streamEditorApplySuccess"))
      navigate("/streams")
    } catch (err) {
      const message = err instanceof Error ? err.message : t("streamEditorApplyFailed")
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
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
        <form className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("streamEditorQueueTitle")}</CardTitle>
                <CardDescription>{t("streamEditorQueueDescription", undefined, { count: timelineIDs.length })}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{t("streamEditorLibrary")}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {libraryVideos.length === 0 ? <p className="text-sm text-muted-foreground">{t("streamEditorNoVideos")}</p> : null}

                    {libraryVideos.map((video) => (
                      <button
                        key={video.id}
                        type="button"
                        draggable
                        onDragStart={() => setDragPayload(`library:${video.id}`)}
                        onClick={() => addToTimeline(video.id)}
                        className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-left"
                      >
                        <span className="truncate text-sm">{video.filename}</span>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{t("streamEditorTimeline")}</p>
                  <div
                    className="flex min-h-24 gap-2 overflow-x-auto rounded-md border border-dashed border-border bg-muted/30 p-2"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => handleTimelineDrop(null)}
                  >
                    {timelineVideos.length === 0 ? (
                      <div className="flex w-full items-center justify-center text-sm text-muted-foreground">{t("streamEditorDragHere")}</div>
                    ) : null}

                    {timelineVideos.map((video, index) => (
                      <div
                        key={video.id}
                        draggable
                        onDragStart={() => setDragPayload(`timeline:${video.id}`)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => handleTimelineDrop(video.id)}
                        onClick={() => setPreviewVideoID(video.id)}
                        className={
                          "min-w-[180px] rounded-md border border-border bg-card px-2 py-2 " +
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
                              onClick={() => moveTimelineItem(video.id, "left")}
                              className="rounded border border-border p-1 disabled:opacity-40"
                              disabled={index === 0}
                            >
                              <ArrowLeft className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveTimelineItem(video.id, "right")}
                              className="rounded border border-border p-1 disabled:opacity-40"
                              disabled={index === timelineVideos.length - 1}
                            >
                              <ArrowRight className="h-3 w-3" />
                            </button>
                            <button type="button" onClick={() => removeFromTimeline(video.id)} className="rounded border border-danger/40 p-1 text-danger">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        <p className="truncate text-sm font-medium">{video.filename}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-border bg-card p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">{t("streamEditorPreview")}</p>
                    <Button type="button" variant="outline" size="sm" onClick={togglePreviewPlayback} disabled={!previewVideo}>
                      {previewPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {previewPlaying ? t("streamEditorPause") : t("streamEditorPlay")}
                    </Button>
                  </div>

                  {previewVideo ? (
                    <>
                      <video
                        key={previewVideo.id}
                        ref={previewRef}
                        src={`/uploads/${previewVideo.source}`}
                        controls
                        className="aspect-video w-full rounded-md border border-border bg-black"
                        onPlay={() => setPreviewPlaying(true)}
                        onPause={() => setPreviewPlaying(false)}
                      />
                      <p className="mt-2 truncate text-xs text-muted-foreground">{previewVideo.filename}</p>
                    </>
                  ) : (
                    <div className="flex aspect-video items-center justify-center rounded-md border border-border bg-muted/30 text-sm text-muted-foreground">
                      <CirclePlay className="mr-2 h-4 w-4" />
                      {t("streamEditorSelectPreview")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("streamEditorIdentityTitle")}</CardTitle>
                <CardDescription>{t("streamEditorIdentityDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("streamEditorNamePlaceholder")} required />
                <Input
                  type="number"
                  min={500}
                  value={bitrate}
                  onChange={(event) => setBitrate(Number(event.target.value))}
                  placeholder={t("streamEditorBitratePlaceholder")}
                />
                <Input value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder={t("streamEditorResolutionPlaceholder")} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("streamEditorTargetsTitle")}</CardTitle>
                <CardDescription>{t("streamEditorTargetsDescription", undefined, { count: targets.length })}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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

                <div className="flex flex-wrap gap-2">
                  {targets.map((target) => (
                    <span key={target} className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs">
                      <span className="truncate">{target}</span>
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
                        <span className="block text-sm font-medium">{platform.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{platform.rtmp_url}</span>
                      </span>
                      <span className="text-xs font-medium">{t("streamEditorAdd")}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" disabled={saving}>
              {saving ? t("streamEditorApplyingButton") : t("streamEditorSaveButton")}
            </Button>
          </div>
        </form>
      ) : null}
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
