import { Badge } from "@/components/ui/badge"
import type { ActivityLogEntry } from "@/lib/api"
import type { TranslateFn } from "@/lib/i18n"

import {
  activityIcon,
  buildActivityMetadata,
  formatActivityTime,
  itemHeadline,
  levelLabel,
  levelVariant,
  resolveActivityLevel,
  sourceLabel,
} from "./activity-utils"

interface ActivityFeedProps {
  items: ActivityLogEntry[]
  t: TranslateFn
}

export function ActivityFeed({ items, t }: ActivityFeedProps) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const level = resolveActivityLevel(item)
        const Icon = activityIcon(item)
        const metadata = buildActivityMetadata(item, t)

        return (
          <article key={`${item.timestamp}-${item.path}-${index}`} className="rounded-lg border border-border bg-card px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{itemHeadline(item, t)}</p>
                  <p className="text-xs text-muted-foreground">{formatActivityTime(item.timestamp)}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="muted">{sourceLabel(item, t)}</Badge>
                <Badge variant={levelVariant(level)}>{levelLabel(level, t)}</Badge>
              </div>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">{metadata.join(" • ") || "-"}</p>
          </article>
        )
      })}
    </div>
  )
}
