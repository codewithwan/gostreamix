import { useEffect, useMemo, useState } from "react"

import { getDashboardMetrics, getDashboardStats, getPlatforms, getStreams, getVideos, type MetricSample, type Stream } from "@/lib/api"
import type { ChartPoint } from "./dashboard-types"
import { formatSampleLabel } from "./dashboard-utils"

export function useDashboardData(t: (key: string, fallback?: string) => string) {
  const [cpu, setCPU] = useState(0)
  const [memory, setMemory] = useState(0)
  const [disk, setDisk] = useState(0)
  const [series, setSeries] = useState<MetricSample[]>([])
  const [streams, setStreams] = useState<Stream[]>([])
  const [videosCount, setVideosCount] = useState(0)
  const [platformsCount, setPlatformsCount] = useState(0)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

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
        if (!mounted) return
        setCPU(stats.cpu)
        setMemory(stats.memory)
        setDisk(stats.disk)
        setSeries(metrics.items)
        setStreams(streamData)
        setVideosCount(videoData.length)
        setPlatformsCount(platformData.length)
        setError("")
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : t("dashboardNoMetrics"))
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void load()
    const interval = window.setInterval(() => void load(), 10000)
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

  return { activeStreams, chartData, cpu, disk, error, loading, memory, platformsCount, streams, videosCount }
}
