import { Activity, Cpu, HardDrive, Layers, MemoryStick, PlaySquare, Video, Wifi } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { OverviewBlock, StatBlock, TrendChartCard } from "@/features/dashboard/dashboard-cards"
import { RecentStreamsCard } from "@/features/dashboard/recent-streams-card"
import { SpeedTestDialog } from "@/features/dashboard/speed-test-dialog"
import { useDashboardData } from "@/features/dashboard/use-dashboard-data"
import { useSpeedTest } from "@/features/dashboard/use-speed-test"
import { useI18n } from "@/lib/i18n"

export function DashboardPage() {
  const { t } = useI18n()
  const dashboard = useDashboardData(t)
  const [speedTestOpen, setSpeedTestOpen] = useState(false)
  const speedTest = useSpeedTest(speedTestOpen)

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("dashboardTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("dashboardDescription")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSpeedTestOpen(true)
            speedTest.reset()
          }}
          className="h-8 shrink-0 gap-1.5 border-primary/20 bg-primary/[0.02] px-3 text-xs text-primary hover:border-primary/50"
        >
          <Wifi className="h-4 w-4" />
          <span>Test Connection</span>
        </Button>
      </div>

      {dashboard.error ? <p className="text-sm text-danger">{dashboard.error}</p> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatBlock title="CPU" value={`${dashboard.cpu.toFixed(1)}%`} hint={t("dashboardCPUHint")} icon={<Cpu className="h-4 w-4" />} />
        <StatBlock title="Memory" value={`${dashboard.memory.toFixed(1)}%`} hint={t("dashboardMemoryHint")} icon={<MemoryStick className="h-4 w-4" />} />
        <StatBlock title="Disk" value={`${dashboard.disk.toFixed(1)}%`} hint={t("dashboardDiskHint")} icon={<HardDrive className="h-4 w-4" />} />
      </div>

      {dashboard.chartData.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted-foreground">{t("dashboardNoMetrics")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          <TrendChartCard title={t("dashboardChartTitleCPU")} latestValue={dashboard.cpu} data={dashboard.chartData} dataKey="cpu" colorVar="var(--chart-cpu)" description={t("dashboardChartDescription")} />
          <TrendChartCard title={t("dashboardChartTitleMemory")} latestValue={dashboard.memory} data={dashboard.chartData} dataKey="memory" colorVar="var(--chart-memory)" description={t("dashboardChartDescription")} />
          <TrendChartCard title={t("dashboardChartTitleDisk")} latestValue={dashboard.disk} data={dashboard.chartData} dataKey="disk" colorVar="var(--chart-disk)" description={t("dashboardChartDescription")} />
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">{t("dashboardOverviewTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("dashboardOverviewDescription")}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <OverviewBlock title={t("dashboardStreamsCount")} value={String(dashboard.streams.length)} icon={<PlaySquare className="h-4 w-4" />} />
          <OverviewBlock title={t("dashboardVideosCount")} value={String(dashboard.videosCount)} icon={<Video className="h-4 w-4" />} />
          <OverviewBlock title={t("dashboardPlatformsCount")} value={String(dashboard.platformsCount)} icon={<Layers className="h-4 w-4" />} />
          <OverviewBlock title={t("dashboardActiveStreams")} value={String(dashboard.activeStreams)} icon={<Activity className="h-4 w-4" />} />
        </div>
      </div>

      <RecentStreamsCard streams={dashboard.streams} t={t} />
      <SpeedTestDialog open={speedTestOpen} onOpenChange={setSpeedTestOpen} onStart={speedTest.startSpeedTest} t={t} {...speedTest} />
    </section>
  )
}
