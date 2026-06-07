import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Stream } from "@/lib/api"
import { statusVariant } from "./stream-utils"

interface StreamListProps {
  loading: boolean
  onDelete: (stream: Stream) => void
  onStart: (streamID: string) => void
  onStop: (streamID: string) => void
  streams: Stream[]
  t: (key: string, fallback?: string) => string
}

export function StreamList({ loading, onDelete, onStart, onStop, streams, t }: StreamListProps) {
  return (
    <div className="grid gap-3">
      {loading ? <p className="text-sm text-muted-foreground">{t("streamsLoading")}</p> : null}
      {!loading && streams.length === 0 ? <p className="text-sm text-muted-foreground">{t("streamsEmpty")}</p> : null}
      {streams.map((stream) => (
        <StreamCard key={stream.id} onDelete={onDelete} onStart={onStart} onStop={onStop} stream={stream} t={t} />
      ))}
    </div>
  )
}

function StreamCard({ onDelete, onStart, onStop, stream, t }: Omit<StreamListProps, "loading" | "streams"> & { stream: Stream }) {
  const isRunning = stream.status === "running"
  const isStarting = stream.status === "starting"
  const isStopping = stream.status === "stopping"

  return (
    <Card>
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
          <Button size="sm" disabled={isRunning || isStarting || isStopping} onClick={() => onStart(stream.id)}>
            {t("streamsStart")}
          </Button>
          <Button size="sm" variant="subtle" disabled={!isRunning || isStarting || isStopping} onClick={() => onStop(stream.id)}>
            {t("streamsStop")}
          </Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(stream)}>
            {t("delete")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
