import { type FormEvent, useState } from "react"
import { useNavigate } from "react-router-dom"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { CreateStreamDialog } from "@/features/streams/create-stream-dialog"
import { DeleteStreamDialog } from "@/features/streams/delete-stream-dialog"
import { RenameStreamDialog } from "@/features/streams/rename-stream-dialog"
import { StopStreamDialog } from "@/features/streams/stop-stream-dialog"
import { StreamList } from "@/features/streams/stream-list"
import { useStreamWS } from "@/features/streams/use-stream-ws"
import { createStream, deleteStream, getPlatforms, getStreams, getVideos, renameStream, startStream, stopStream, type Platform, type Stream } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useEffect } from "react"

const NIL_UUID = "00000000-0000-0000-0000-000000000000"

export function StreamsPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [streams, setStreams] = useState<Stream[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<Stream | null>(null)
  const [stopDialog, setStopDialog] = useState<Stream | null>(null)
  const [renameDialog, setRenameDialog] = useState<Stream | null>(null)
  const [renameName, setRenameName] = useState("")

  const showError = (err: unknown, fallback: string) => {
    const message = err instanceof Error ? err.message : fallback
    setError(message)
    toast.error(message)
  }

  const loadStreams = async () => {
    try { setStreams(await getStreams()) }
    catch (err) { showError(err, t("streamsLoadFailed")) }
    finally { setLoading(false) }
  }

  const loadDependencies = async () => {
    try { const [, p] = await Promise.all([getVideos(), getPlatforms()]); setPlatforms(p) }
    catch (err) { showError(err, t("streamsDependencyFailed")) }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([loadStreams(), loadDependencies()])
    window.setTimeout(() => setIsRefreshing(false), 1500)
  }

  useEffect(() => { void Promise.all([loadStreams(), loadDependencies()]) }, [])
  useStreamWS(setStreams)

  const runStreamAction = async (action: () => Promise<void>, success: string, failure: string, toastSuccess = true) => {
    setError("")
    try {
      await action()
      await loadStreams()
      if (toastSuccess && success) toast.success(success)
    } catch (err) { showError(err, failure) }
  }

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")
    const trimmedName = name.trim()
    if (!trimmedName) { showError(new Error(t("streamsNameRequired")), t("streamsNameRequired")); setSubmitting(false); return }
    try {
      const created = await createStream({ name: trimmedName, video_id: NIL_UUID, rtmp_targets: ["rtmp://localhost/live/placeholder"], bitrate: 3000, resolution: "1280x720", fps: 30, loop: true })
      setCreateOpen(false); setName(""); toast.success(t("streamsCreateSuccess"))
      created?.id ? navigate(`/streams/${created.id}/editor`) : await loadStreams()
    } catch (err) { showError(err, t("streamsCreateFailed")) }
    finally { setSubmitting(false) }
  }

  const handleStart = (streamID: string) => runStreamAction(() => startStream(streamID), t("streamsStartSuccess"), t("streamsStartFailed"), false)
  const handleStop = (stream: Stream) => setStopDialog(stream)
  const performStop = async () => {
    if (!stopDialog) return
    await runStreamAction(() => stopStream(stopDialog.id), t("streamsStopSuccess"), t("streamsStopFailed"), false)
    setStopDialog(null)
  }

  const openRename = (stream: Stream) => { setRenameDialog(stream); setRenameName(stream.name) }
  const handleRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!renameDialog) return
    setSubmitting(true)
    try { await renameStream(renameDialog.id, renameName); setRenameDialog(null); await loadStreams(); toast.success(t("streamsRenameSuccess")) }
    catch (err) { showError(err, t("streamsRenameFailed")) }
    finally { setSubmitting(false) }
  }

  const performDelete = async (streamID: string) => {
    await runStreamAction(() => deleteStream(streamID), t("streamsDeleteSuccess"), t("streamsDeleteFailed"))
    setDeleteDialog(null)
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
      <StreamList loading={loading} onDelete={setDeleteDialog} onRename={openRename} onStart={(id) => void handleStart(id)} onStop={(stream) => void handleStop(stream)} platforms={platforms} streams={streams} t={t} />
      <DeleteStreamDialog stream={deleteDialog} onOpenChange={(open) => !open && setDeleteDialog(null)} onDelete={(id) => void performDelete(id)} t={t} />
      <RenameStreamDialog open={renameDialog !== null} stream={renameDialog} name={renameName} onNameChange={setRenameName} onOpenChange={(open) => !open && setRenameDialog(null)} onSubmit={handleRename} submitting={submitting} t={t} />
      <StopStreamDialog stream={stopDialog} onClose={() => setStopDialog(null)} onConfirm={() => void performStop()} t={t} />
    </section>
  )
}
