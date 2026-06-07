import { StopCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Stream } from "@/lib/api"
import type { TranslateFn } from "@/lib/i18n"

interface StopStreamDialogProps {
  stream: Stream | null
  onClose: () => void
  onConfirm: () => void
  t: TranslateFn
}

export function StopStreamDialog({ stream, onClose, onConfirm, t }: StopStreamDialogProps) {
  return (
    <Dialog open={stream !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StopCircle className="h-5 w-5 text-amber-500" />
            {t("streamsStopConfirm", "Stop stream \"{name}\"?", { name: stream?.name ?? "" })}
          </DialogTitle>
          <DialogDescription>
            {t("streamsStopConfirmDesc", "This will stop the live broadcast for \"{name}\".", { name: stream?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button variant="danger" onClick={onConfirm}>
            <StopCircle className="h-4 w-4" />
            {t("streamsStop")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
