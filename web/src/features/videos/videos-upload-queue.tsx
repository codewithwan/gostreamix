import { CheckCircle2, MoreHorizontal, UploadCloud, X } from "lucide-react"
import type { TranslateFn } from "@/lib/i18n"
import type { UploadQueueItem } from "./videos-types"

export function UploadQueue({ items, uploading, open, onOpenChange, onClear, t }: { items: UploadQueueItem[]; uploading: boolean; open: boolean; onOpenChange: (open: boolean) => void; onClear: () => void; t: TranslateFn }) {
  if (items.length === 0) return null
  const done = items.filter((item) => item.status === "done").length
  const failed = items.filter((item) => item.status === "error").length
  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(360px,calc(100vw-2rem))] rounded-md border border-border bg-card shadow-lg">
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left" onClick={() => onOpenChange(!open)}>
          <span className="inline-flex min-w-0 items-center gap-2">
            {uploading ? <UploadCloud className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
            <span className="truncate text-sm font-medium">{failed > 0 ? t("videosUploadQueueFinishedWithErrors", "{done}/{total} uploaded, {failed} failed", { done, total: items.length, failed }) : uploading ? t("videosUploadQueueSummary", "{done}/{total} uploaded", { done, total: items.length }) : t("videosUploadQueueComplete", "{count} video(s) uploaded", { count: items.length })}</span>
          </span>
          <MoreHorizontal className="h-4 w-4 shrink-0" />
        </button>
        {!uploading ? <button type="button" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md hover:bg-muted" aria-label={t("close")} onClick={onClear}><X className="h-4 w-4" /></button> : null}
      </div>
      {open ? <div className="max-h-72 space-y-2 overflow-auto border-t border-border p-3">{items.map((item) => <QueueItem key={item.id} item={item} t={t} />)}</div> : null}
    </div>
  )
}

function QueueItem({ item, t }: { item: UploadQueueItem; t: TranslateFn }) {
  const label = item.status === "error" ? t("videosUploadStatusFailed", "Failed") : item.status === "done" ? t("videosUploadStatusDone", "Uploaded") : item.status === "queued" ? t("videosUploadStatusQueued", "Queued") : `${item.progress}%`
  return <div className="space-y-1"><div className="flex items-center justify-between gap-2 text-xs"><span className="truncate">{item.name}</span><span className={item.status === "error" ? "text-danger" : item.status === "done" ? "text-emerald-500" : "text-muted-foreground"}>{label}</span></div>{item.status === "done" ? <p className="inline-flex items-center gap-1 text-xs text-emerald-500"><CheckCircle2 className="h-3.5 w-3.5" />{t("videosUploadItemComplete", "Successfully uploaded")}</p> : <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={item.status === "error" ? "h-full bg-danger" : "h-full bg-primary"} style={{ width: `${item.progress}%` }} /></div>}{item.error ? <p className="text-xs text-danger">{item.error}</p> : null}</div>
}
