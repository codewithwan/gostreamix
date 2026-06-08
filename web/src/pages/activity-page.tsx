import { useEffect, useMemo, useState } from "react"
import { RefreshCw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ActivityFeed } from "@/features/activity/activity-feed"
import { getActivityLogs, type ActivityLogsResponse } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

const emptyActivityResponse: ActivityLogsResponse = {
  items: [],
  page: 1,
  per_page: PAGE_SIZE,
  total: 0,
  total_pages: 0,
}

export function ActivityPage({ embed = false }: { embed?: boolean }) {
  const { t } = useI18n()

  const [result, setResult] = useState<ActivityLogsResponse>(emptyActivityResponse)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [lastUpdated, setLastUpdated] = useState("")
  const [page, setPage] = useState(1)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const load = async ({ showLoader }: { showLoader: boolean }) => {
    if (showLoader) {
      setLoading(true)
    }

    try {
      const data = await getActivityLogs(page, PAGE_SIZE)
      setResult(data)
      if (data.page !== page) {
        setPage(data.page)
      }
      setError("")
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err instanceof Error ? err.message : t("activityNoData"))
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await load({ showLoader: false })
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1500)
  }

  useEffect(() => {
    void load({ showLoader: true })
    const timer = window.setInterval(() => {
      void load({ showLoader: false })
    }, 10000)

    return () => {
      window.clearInterval(timer)
    }
  }, [page])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) {
      return result.items
    }

    return result.items.filter((item) => {
      return (
        item.path.toLowerCase().includes(keyword) ||
        item.method.toLowerCase().includes(keyword) ||
        item.ip.toLowerCase().includes(keyword) ||
        item.message.toLowerCase().includes(keyword) ||
        item.event.toLowerCase().includes(keyword) ||
        item.source.toLowerCase().includes(keyword) ||
        item.level.toLowerCase().includes(keyword) ||
        (item.stream_id ?? "").toLowerCase().includes(keyword) ||
        String(item.status).includes(keyword)
      )
    })
  }, [result.items, query])

  const pageStart = result.total === 0 ? 0 : (result.page - 1) * result.per_page + 1
  const pageEnd = result.total === 0 ? 0 : Math.min(result.total, pageStart + result.items.length - 1)

  const content = (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("activityTitle")}</CardTitle>
        <CardDescription>{t("activityDescriptionLong")}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="block w-full max-w-[460px] space-y-1.5">
            <span className="text-sm font-medium">{t("activitySearchPlaceholder")}</span>
            <Input
              placeholder={t("activitySearchPlaceholder")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted">{t("activityTotalCount", undefined, { count: result.total })}</Badge>
            <Badge variant="muted">{t("activityPageSummary", undefined, { page: result.page, total: Math.max(result.total_pages, 1) })}</Badge>
          </div>
        </div>

        {error ? <p className="text-sm text-danger">{error}</p> : null}
        {loading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : null}

        {!loading && filtered.length === 0 ? <p className="text-sm text-muted-foreground">{t("activityNoData")}</p> : null}

        {!loading && filtered.length > 0 ? <ActivityFeed items={filtered} t={t} /> : null}

        {!loading ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              {t("activityRangeSummary", undefined, {
                start: pageStart,
                end: pageEnd,
                total: result.total,
              })}
            </p>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={loading || result.page <= 1}>
                {t("activityPrevious")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((current) => Math.min(Math.max(result.total_pages, 1), current + 1))}
                disabled={loading || result.total_pages === 0 || result.page >= result.total_pages}
              >
                {t("activityNext")}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )

  if (embed) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{lastUpdated ? t("activityUpdated", undefined, { time: lastUpdated }) : ""}</span>
          <Button size="sm" variant="outline" onClick={() => void handleRefresh()} disabled={isRefreshing || loading}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {t("refresh")}
          </Button>
        </div>
        {content}
      </div>
    )
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{t("activityTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("activityDescription")}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{lastUpdated ? t("activityUpdated", undefined, { time: lastUpdated }) : ""}</span>
          <Button variant="outline" onClick={() => void handleRefresh()} disabled={isRefreshing || loading}>
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            {t("refresh")}
          </Button>
        </div>
      </div>
      {content}
    </section>
  )
}
