import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Stream } from "@/lib/api"

interface DeleteStreamDialogProps {
  onDelete: (streamID: string) => void
  onOpenChange: (open: boolean) => void
  stream: Stream | null
  t: (key: string, fallback?: string) => string
}

export function DeleteStreamDialog({ onDelete, onOpenChange, stream, t }: DeleteStreamDialogProps) {
  return (
    <Dialog open={stream !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("delete")}</DialogTitle>
          <DialogDescription>
            {stream?.status === "running"
              ? t("streamsDeleteRunningConfirm", "This stream is currently running. Deleting it will stop the pipeline first.")
              : t("streamsDeleteConfirm")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="danger" onClick={() => stream && onDelete(stream.id)}>
            {t("delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
