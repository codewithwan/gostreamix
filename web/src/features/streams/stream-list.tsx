import { Link } from "react-router-dom"
import { SquarePen, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PlatformIcon } from "@/features/platforms/platform-icon"
import { buildRTMPTarget } from "@/features/platforms/platform-utils"
import type { Platform, Stream } from "@/lib/api"
import { statusVariant } from "./stream-utils"

interface StreamListProps {
  loading: boolean
  onDelete: (stream: Stream) => void
  onRename: (stream: Stream) => void
  onStart: (streamID: string) => void
  onStop: (stream: Stream) => void
  platforms: Platform[]
  streams: Stream[]
  t: (key: string, fallback?: string) => string
}

export function StreamList(props: StreamListProps) {
  return (
    <div className="grid gap-3">
      {props.loading ? <p className="text-sm text-muted-foreground">{props.t("streamsLoading")}</p> : null}
      {!props.loading && props.streams.length === 0 ? <p className="text-sm text-muted-foreground">{props.t("streamsEmpty")}</p> : null}
      {props.streams.map((stream) => (
        <StreamCard key={stream.id} {...props} stream={stream} />
      ))}
    </div>
  )
}

function StreamCard(props: Omit<StreamListProps, "loading" | "streams"> & { stream: Stream }) {
  const { onDelete, onRename, onStart, onStop, platforms, stream, t } = props
  const isRunning = stream.status === "running"
  const isStarting = stream.status === "starting"
  const isStopping = stream.status === "stopping"
  const matchedPlatforms = platforms.filter((platform) => stream.rtmp_targets.includes(buildRTMPTarget(platform.platform_type, platform.custom_url, platform.stream_key)))

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{stream.name}</p>
              <Badge variant={statusVariant(stream.status)}>{stream.status}</Badge>
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => onRename(stream)}
                title={t("streamsRenameAction")}
              >
                <SquarePen className="h-3.5 w-3.5" />
                <span className="sr-only">{t("streamsRenameAction")}</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {stream.resolution} | {stream.bitrate} kbps | {stream.fps} fps | {stream.rtmp_targets.length} target(s)
            </p>
          </div>
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <Button asChild variant="outline" size="sm" className="flex-1 md:flex-initial">
              <Link to={`/streams/${stream.id}/editor`}>{t("streamsEditor")}</Link>
            </Button>
            <div className="flex items-center gap-2">
              {isRunning || isStarting || isStopping ? (
                <Button
                  size="sm"
                  variant="subtle"
                  disabled={isStarting || isStopping}
                  onClick={() => onStop(stream)}
                  className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                >
                  {isStopping ? "Stopping..." : t("streamsStop")}
                </Button>
              ) : (
                <Button size="sm" disabled={isStarting} onClick={() => onStart(stream.id)}>
                  {isStarting ? "Starting..." : t("streamsStart")}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 dark:hover:text-red-400 shrink-0"
                onClick={() => onDelete(stream)}
                title={t("delete")}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">{t("delete")}</span>
              </Button>
            </div>
          </div>
        </div>
        <PlatformSummary platforms={matchedPlatforms} targetCount={stream.rtmp_targets.length} t={t} />
      </CardContent>
    </Card>
  )
}

function PlatformSummary({ platforms, targetCount, t }: { platforms: Platform[]; targetCount: number; t: StreamListProps["t"] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">{t("streamsPlatformsLabel")}:</span>
      {platforms.map((platform) => (
        <span key={platform.id} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
          <PlatformIcon type={platform.platform_type} />
          {platform.name}
        </span>
      ))}
      {platforms.length === 0 ? <span>{targetCount > 0 ? t("streamsCustomTargets") : t("streamsNoTargets")}</span> : null}
    </div>
  )
}
