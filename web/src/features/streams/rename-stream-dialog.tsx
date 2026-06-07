import { type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { Stream } from "@/lib/api"

interface RenameStreamDialogProps {
  name: string
  onNameChange: (name: string) => void
  onOpenChange: (open: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  open: boolean
  stream: Stream | null
  submitting: boolean
  t: (key: string, fallback?: string) => string
}

export function RenameStreamDialog(props: RenameStreamDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{props.t("streamsRenameTitle")}</DialogTitle>
          <DialogDescription>{props.stream?.name || props.t("streamsRenameDescription")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={props.onSubmit}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{props.t("streamsNamePlaceholder")}</span>
            <Input value={props.name} onChange={(event) => props.onNameChange(event.target.value)} required />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => props.onOpenChange(false)}>{props.t("cancel")}</Button>
            <Button type="submit" disabled={props.submitting}>{props.submitting ? props.t("streamsRenaming") : props.t("streamsRenameAction")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
