import { type FormEvent, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { CreateStreamDialog } from "@/features/streams/create-stream-dialog"
import { DeleteStreamDialog } from "@/features/streams/delete-stream-dialog"
import { StreamList } from "@/features/streams/stream-list"
import type { StreamWSMessage } from "@/features/streams/stream-utils"
import { createStream, deleteStream, getPlatforms, getStreams, getVideos, startStream, stopStream, type Stream } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const NIL_UUID = "00000000-0000-0000-0000-000000000000"

export function StreamsPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [streams, setStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<Stream | null>(null)

  const loadStreams = async () => {
    try {
      setStreams(await getStreams())
    } catch (err) {
      showError(err, t("streamsLoadFailed"))
    } finally {
      setLoading(false)
    }
  }

  const loadDependencies = async () => {
    try {
      await Promise.all([getVideos(), getPlatforms()])
    } catch (err) {
      showError(err, t("streamsDependencyFailed"))
    }
  }

  const showError = (err: unknown, fallback: string) => {
    const message = err instanceof Error ? err.message : fallback
    setError(message)
    toast.error(message)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([loadStreams(), loadDependencies()])
    window.setTimeout(() => setIsRefreshing(false), 1500)
  }

  useEffect(() => {
    void Promise.all([loadStreams(), loadDependencies()])
  }, [])

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`)
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as StreamWSMessage
        if (message.type !== "stream_status" || !message.payload?.stream_id || !message.payload.status) return
        setStreams((current) =>
          current.map((stream) => (stream.id === message.payload?.stream_id ? { ...stream, status: message.payload.status || stream.status } : stream)),
        )
      } catch {
        // Ignore malformed websocket frames; polling and manual refresh remain available.
      }
    }
    return () => socket.close()
  }, [])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    const trimmedName = name.trim()
    if (!trimmedName) {
      showError(new Error(t("streamsNameRequired")), t("streamsNameRequired"))
      setSubmitting(false)
      return
    }
    try {
      const created = await createStream({
        name: trimmedName,
        video_id: NIL_UUID,
        rtmp_targets: ["rtmp://localhost/live/placeholder"],
        bitrate: 3000,
        resolution: "1280x720",
        fps: 30,
        loop: true,
      })
      setCreateOpen(false)
      setName("")
      toast.success(t("streamsCreateSuccess"))
      created?.id ? navigate(`/streams/${created.id}/editor`) : await loadStreams()
    } catch (err) {
      showError(err, t("streamsCreateFailed"))
    } finally {
      setSubmitting(false)
    }
  }

  const handleStart = async (streamID: string) => runStreamAction(() => startStream(streamID), t("streamsStartSuccess"), t("streamsStartFailed"))
  const handleStop = async (streamID: string) => runStreamAction(() => stopStream(streamID), t("streamsStopSuccess"), t("streamsStopFailed"))

  const performDelete = async (streamID: string) => {
    await runStreamAction(() => deleteStream(streamID), t("streamsDeleteSuccess"), t("streamsDeleteFailed"))
    setDeleteDialog(null)
  }

  const runStreamAction = async (action: () => Promise<void>, success: string, failure: string) => {
    setError("")
    try {
      await action()
      await loadStreams()
      toast.success(success)
    } catch (err) {
      showError(err, failure)
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
          <Button variant="outline" onClick={() => void handleRefresh()} disabled={isRefreshing || loading}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {t("refresh")}
          </Button>
          <CreateStreamDialog name={name} onNameChange={setName} onOpenChange={setCreateOpen} onSubmit={handleCreate} open={createOpen} submitting={submitting} t={t} />
        </div>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <StreamList loading={loading} onDelete={setDeleteDialog} onStart={(id) => void handleStart(id)} onStop={(id) => void handleStop(id)} streams={streams} t={t} />
      <DeleteStreamDialog stream={deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)} onDelete={(id) => void performDelete(id)} t={t} />
    </section>
  )
}
