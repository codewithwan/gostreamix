import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Stream } from "@/lib/api"
import { statusVariant } from "./dashboard-utils"

interface RecentStreamsCardProps {
  streams: Stream[]
  t: (key: string, fallback?: string) => string
}

export function RecentStreamsCard({ streams, t }: RecentStreamsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("dashboardRecentStreamsTitle")}</CardTitle>
        <CardDescription>{t("dashboardRecentStreamsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {streams.length === 0 ? <p className="text-sm text-muted-foreground">{t("dashboardNoStreams")}</p> : <StreamTables streams={streams} t={t} />}
      </CardContent>
    </Card>
  )
}

function StreamTables({ streams, t }: RecentStreamsCardProps) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {streams.slice(0, 6).map((stream) => (
          <div key={stream.id} className="rounded-md border border-border bg-muted/35 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{stream.name}</p>
              <Badge variant={statusVariant(stream.status)}>{stream.status}</Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{stream.rtmp_targets.length} {t("dashboardTargets")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stream.resolution} / {stream.bitrate} kbps</p>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <table className="min-w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-2 py-1">{t("name")}</th>
              <th className="px-2 py-1">{t("dashboardStatus")}</th>
              <th className="px-2 py-1">{t("dashboardTargets")}</th>
              <th className="px-2 py-1">{t("dashboardQuality")}</th>
            </tr>
          </thead>
          <tbody>
            {streams.slice(0, 6).map((stream) => (
              <tr key={stream.id} className="rounded-md bg-muted/35">
                <td className="rounded-l-md px-2 py-2 font-medium">{stream.name}</td>
                <td className="px-2 py-2"><Badge variant={statusVariant(stream.status)}>{stream.status}</Badge></td>
                <td className="px-2 py-2">{stream.rtmp_targets.length}</td>
                <td className="rounded-r-md px-2 py-2 text-muted-foreground">{stream.resolution} / {stream.bitrate} kbps</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
