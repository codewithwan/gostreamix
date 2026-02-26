import { FormEvent, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  createStream,
  deleteStream,
  getPlatforms,
  getStreams,
  getVideos,
  startStream,
  stopStream,
  type Platform,
  type Stream,
  type Video,
} from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const NIL_UUID = "00000000-0000-0000-0000-000000000000"

function statusVariant(status: string) {
  if (status === "running") {
    return "success" as const
  }
  if (status === "error") {
    return "danger" as const
  }
  if (status === "starting" || status === "stopping") {
    return "warning" as const
  }
  return "muted" as const
}

function platformTypeLabel(type: string, t: (key: string, fallback?: string) => string) {
  if (type === "youtube") {
    return t("platformTypeYoutube")
  }
  if (type === "twitch") {
    return t("platformTypeTwitch")
  }
  if (type === "facebook") {
    return t("platformTypeFacebook")
  }
  if (type === "tiktok") {
    return t("platformTypeTiktok")
  }
  return t("platformTypeCustom")
}

function buildRTMPTarget(platformType: string, customURL: string, streamKey: string) {
  const type = platformType.trim().toLowerCase()
  const key = streamKey.trim()
  let base = customURL.trim()

  if (!base) {
    if (type === "youtube") {
      base = "rtmp://a.rtmp.youtube.com/live2"
    } else if (type === "twitch") {
      base = "rtmp://live.twitch.tv/app"
    } else if (type === "facebook") {
      base = "rtmps://live-api-s.facebook.com:443/rtmp"
    } else if (type === "tiktok") {
      base = "rtmp://push-rtmp-global.tiktok.com/live"
    }
  }

  if (!base) {
    return ""
  }
  if (!key) {
    return base
  }
  if (base.endsWith("/")) {
    return `${base}${key}`
  }
  return `${base}/${key}`
}

export function StreamsPage() {
  const { t } = useI18n()

  const [streams, setStreams] = useState<Stream[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [resolution, setResolution] = useState("1280x720")
  const [bitrate, setBitrate] = useState(3000)
  const [videoID, setVideoID] = useState(NIL_UUID)
  const [selectedPlatformIDs, setSelectedPlatformIDs] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const selectedTargets = useMemo(
    () =>
      platforms
        .filter((platform) => selectedPlatformIDs.includes(platform.id))
        .map((platform) => buildRTMPTarget(platform.platform_type, platform.custom_url, platform.stream_key))
        .filter(Boolean),
    [platforms, selectedPlatformIDs],
  )

  const loadStreams = async () => {
    try {
      const data = await getStreams()
      setStreams(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : t("streamsLoadFailed")
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const loadDependencies = async () => {
    try {
      const [videoData, platformData] = await Promise.all([getVideos(), getPlatforms()])
      setVideos(videoData)
      setPlatforms(platformData)
    } catch (err) {
      const message = err instanceof Error ? err.message : t("streamsDependencyFailed")
      setError(message)
      toast.error(message)
    }
  }

  useEffect(() => {
    void Promise.all([loadStreams(), loadDependencies()])
  }, [])

  const togglePlatform = (platformID: string) => {
    setSelectedPlatformIDs((current) =>
      current.includes(platformID) ? current.filter((id) => id !== platformID) : [...current, platformID],
    )
  }

  const resetCreateState = () => {
    setName("")
    setVideoID(NIL_UUID)
    setSelectedPlatformIDs([])
    setResolution("1280x720")
    setBitrate(3000)
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")

    const trimmedName = name.trim()
    if (!trimmedName) {
      const message = t("streamsNameRequired")
      setError(message)
      toast.error(message)
      setSubmitting(false)
      return
    }
    if (videoID === NIL_UUID) {
      const message = t("streamsVideoRequired")
      setError(message)
      toast.error(message)
      setSubmitting(false)
      return
    }
    if (selectedTargets.length === 0) {
      const message = t("streamsTargetRequired")
      setError(message)
      toast.error(message)
      setSubmitting(false)
      return
    }

    try {
      await createStream({
        name: trimmedName,
        video_id: videoID,
        rtmp_targets: selectedTargets,
        bitrate,
        resolution,
        fps: 30,
        loop: true,
      })

      setCreateOpen(false)
      resetCreateState()
      await loadStreams()
      toast.success(t("streamsCreateSuccess"))
    } catch (err) {
      const message = err instanceof Error ? err.message : t("streamsCreateFailed")
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleStart = async (streamID: string) => {
    setError("")
    try {
      await startStream(streamID)
      await loadStreams()
      toast.success(t("streamsStartSuccess"))
    } catch (err) {
      const message = err instanceof Error ? err.message : t("streamsStartFailed")
      setError(message)
      toast.error(message)
    }
  }

  const handleStop = async (streamID: string) => {
    setError("")
    try {
      await stopStream(streamID)
      await loadStreams()
      toast.success(t("streamsStopSuccess"))
    } catch (err) {
      const message = err instanceof Error ? err.message : t("streamsStopFailed")
      setError(message)
      toast.error(message)
    }
  }

  const handleDelete = async (streamID: string) => {
    const ok = window.confirm(t("streamsDeleteConfirm"))
    if (!ok) {
      return
    }

    setError("")
    try {
      await deleteStream(streamID)
      await loadStreams()
      toast.success(t("streamsDeleteSuccess"))
    } catch (err) {
      const message = err instanceof Error ? err.message : t("streamsDeleteFailed")
      setError(message)
      toast.error(message)
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("streamsTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("streamsDescription")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => void loadStreams()}>
            <RefreshCw className="h-4 w-4" />
            {t("refresh")}
          </Button>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                {t("streamsNewTitle")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("streamsNewTitle")}</DialogTitle>
                <DialogDescription>{t("streamsNewDescription")}</DialogDescription>
              </DialogHeader>

              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Input value={name} onChange={(event) => setName(event.target.value)} required placeholder={t("streamsNamePlaceholder")} />
                  <Select value={videoID} onValueChange={setVideoID}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("streamsSelectVideo")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NIL_UUID}>{t("streamsSelectVideo")}</SelectItem>
                      {videos.map((video) => (
                        <SelectItem key={video.id} value={video.id}>
                          {video.original_name || video.filename}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder={t("streamsResolutionPlaceholder")} />
                  <Input
                    type="number"
                    min={500}
                    value={bitrate}
                    onChange={(event) => setBitrate(Number(event.target.value))}
                    placeholder={t("streamsBitratePlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("streamsTargetsTitle")}</p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {platforms.length === 0 ? <p className="text-sm text-muted-foreground">{t("streamsNoPlatforms")}</p> : null}

                    {platforms.map((platform) => {
                      const target = buildRTMPTarget(platform.platform_type, platform.custom_url, platform.stream_key)
                      const checked = selectedPlatformIDs.includes(platform.id)
                      return (
                        <label
                          key={platform.id}
                          className={cn(
                            "flex items-start gap-3 rounded-md border border-border px-3 py-3",
                            checked ? "bg-muted" : "bg-card",
                          )}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => togglePlatform(platform.id)} className="mt-0.5" />
                          <span className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="flex items-center gap-2">
                              <span className="text-sm font-medium">{platform.name}</span>
                              <Badge variant="muted">{platformTypeLabel(platform.platform_type, t)}</Badge>
                            </span>
                            <span className="truncate text-xs text-muted-foreground">{target || t("streamsMissingTarget")}</span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? t("streamsCreatingButton") : t("streamsCreateButton")}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-3">
        {loading ? <p className="text-sm text-muted-foreground">{t("streamsLoading")}</p> : null}
        {!loading && streams.length === 0 ? <p className="text-sm text-muted-foreground">{t("streamsEmpty")}</p> : null}

        {streams.map((stream) => {
          const isRunning = stream.status === "running"
          const isStarting = stream.status === "starting"
          const isStopping = stream.status === "stopping"

          return (
            <Card key={stream.id}>
              <CardContent className="flex flex-col gap-4 pt-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{stream.name}</p>
                    <Badge variant={statusVariant(stream.status)}>{stream.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stream.resolution} | {stream.bitrate} kbps | {stream.fps} fps | {stream.rtmp_targets.length} target(s)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/streams/${stream.id}/editor`}>{t("streamsEditor")}</Link>
                  </Button>
                  <Button size="sm" disabled={isRunning || isStarting || isStopping} onClick={() => void handleStart(stream.id)}>
                    {t("streamsStart")}
                  </Button>
                  <Button size="sm" variant="subtle" disabled={!isRunning || isStarting || isStopping} onClick={() => void handleStop(stream.id)}>
                    {t("streamsStop")}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => void handleDelete(stream.id)}>
                    {t("delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
