import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Activity, Cpu, HardDrive, Layers, MemoryStick, PlaySquare, Video } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardMetrics, getDashboardStats, getPlatforms, getStreams, getVideos, type MetricSample, type Stream } from "@/lib/api"
import { useI18n } from "@/lib/i18n"

interface StatBlockProps {
  title: string
  value: string
  hint: string
  icon: ReactNode
}

interface OverviewBlockProps {
  title: string
  value: string
  icon: ReactNode
}

interface ChartPoint {
  name: string
  cpu: number
  memory: number
  disk: number
}

interface TrendChartCardProps {
  title: string
  latestValue: number
  colorVar: string
  data: ChartPoint[]
  dataKey: "cpu" | "memory" | "disk"
  description: string
}

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

function StatBlock({ title, value, hint, icon }: StatBlockProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between pt-0 text-xs text-muted-foreground">
        <span>{hint}</span>
        <span className="rounded-md bg-muted p-2 text-foreground">{icon}</span>
      </CardContent>
    </Card>
  )
}

function OverviewBlock({ title, value, icon }: OverviewBlockProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-5">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <span className="rounded-md bg-muted p-2 text-foreground">{icon}</span>
      </CardContent>
    </Card>
  )
}

function TrendChartCard({ title, latestValue, colorVar, data, dataKey, description }: TrendChartCardProps) {
  const gradientID = `${dataKey}-trend-fill`

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="rounded-md border border-border px-2 py-1 text-xs font-medium">{latestValue.toFixed(1)}%</span>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`hsl(${colorVar})`} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={`hsl(${colorVar})`} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value: number | undefined) => `${value ?? 0}%`}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                contentStyle={{
                  borderRadius: 10,
                  borderColor: "hsl(var(--border))",
                  backgroundColor: "hsl(var(--card))",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={`hsl(${colorVar})`}
                fill={`url(#${gradientID})`}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function formatSampleLabel(recordedAt: string, fallbackIndex: number) {
  const date = new Date(recordedAt)
  if (Number.isNaN(date.getTime())) {
    return `#${fallbackIndex + 1}`
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function DashboardPage() {
  const { t } = useI18n()

  const [cpu, setCPU] = useState(0)
  const [memory, setMemory] = useState(0)
  const [disk, setDisk] = useState(0)
  const [series, setSeries] = useState<MetricSample[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [videosCount, setVideosCount] = useState(0)
  const [platformsCount, setPlatformsCount] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const [stats, metrics, streamData, videoData, platformData] = await Promise.all([
          getDashboardStats(),
          getDashboardMetrics(60),
          getStreams(),
          getVideos(),
          getPlatforms(),
        ])

        if (!mounted) {
          return
        }

        setCPU(stats.cpu)
        setMemory(stats.memory)
        setDisk(stats.disk)
        setSeries(metrics.items)
        setStreams(streamData)
        setVideosCount(videoData.length)
        setPlatformsCount(platformData.length)
        setError("")
      } catch (err) {
        if (!mounted) {
          return
        }

        setError(err instanceof Error ? err.message : t("dashboardNoMetrics"))
      }
    }

    void load()
    const interval = window.setInterval(() => {
      void load()
    }, 10000)

    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [t])

  const activeStreams = useMemo(() => streams.filter((stream) => stream.status === "running").length, [streams])

  const chartData = useMemo<ChartPoint[]>(
    () =>
      series.slice(-10).map((item, index) => ({
        name: formatSampleLabel(item.recorded_at, index),
        cpu: Number(item.cpu.toFixed(1)),
        memory: Number(item.memory.toFixed(1)),
        disk: Number(item.disk.toFixed(1)),
      })),
    [series],
  )

  return (
    <section className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("dashboardTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboardDescription")}</p>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatBlock title="CPU" value={`${cpu.toFixed(1)}%`} hint={t("dashboardCPUHint")} icon={<Cpu className="h-4 w-4" />} />
        <StatBlock
          title="Memory"
          value={`${memory.toFixed(1)}%`}
          hint={t("dashboardMemoryHint")}
          icon={<MemoryStick className="h-4 w-4" />}
        />
        <StatBlock title="Disk" value={`${disk.toFixed(1)}%`} hint={t("dashboardDiskHint")} icon={<HardDrive className="h-4 w-4" />} />
      </div>

      {chartData.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">{t("dashboardNoMetrics")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <TrendChartCard
            title={t("dashboardChartTitleCPU")}
            latestValue={cpu}
            data={chartData}
            dataKey="cpu"
            colorVar="var(--chart-cpu)"
            description={t("dashboardChartDescription")}
          />
          <TrendChartCard
            title={t("dashboardChartTitleMemory")}
            latestValue={memory}
            data={chartData}
            dataKey="memory"
            colorVar="var(--chart-memory)"
            description={t("dashboardChartDescription")}
          />
          <TrendChartCard
            title={t("dashboardChartTitleDisk")}
            latestValue={disk}
            data={chartData}
            dataKey="disk"
            colorVar="var(--chart-disk)"
            description={t("dashboardChartDescription")}
          />
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">{t("dashboardOverviewTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("dashboardOverviewDescription")}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <OverviewBlock title={t("dashboardStreamsCount")} value={String(streams.length)} icon={<PlaySquare className="h-4 w-4" />} />
          <OverviewBlock title={t("dashboardVideosCount")} value={String(videosCount)} icon={<Video className="h-4 w-4" />} />
          <OverviewBlock
            title={t("dashboardPlatformsCount")}
            value={String(platformsCount)}
            icon={<Layers className="h-4 w-4" />}
          />
          <OverviewBlock title={t("dashboardActiveStreams")} value={String(activeStreams)} icon={<Activity className="h-4 w-4" />} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboardRecentStreamsTitle")}</CardTitle>
          <CardDescription>{t("dashboardRecentStreamsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {streams.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboardNoStreams")}</p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {streams.slice(0, 6).map((stream) => (
                  <div key={stream.id} className="rounded-md border border-border bg-muted/35 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{stream.name}</p>
                      <Badge variant={statusVariant(stream.status)}>{stream.status}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{stream.rtmp_targets.length} {t("dashboardTargets")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stream.resolution} / {stream.bitrate} kbps
                    </p>
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
                        <td className="px-2 py-2">
                          <Badge variant={statusVariant(stream.status)}>{stream.status}</Badge>
                        </td>
                        <td className="px-2 py-2">{stream.rtmp_targets.length}</td>
                        <td className="rounded-r-md px-2 py-2 text-muted-foreground">
                          {stream.resolution} / {stream.bitrate} kbps
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
