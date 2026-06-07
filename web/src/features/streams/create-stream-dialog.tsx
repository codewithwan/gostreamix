import { type FormEvent } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

interface CreateStreamDialogProps {
  name: string
  onNameChange: (name: string) => void
  onOpenChange: (open: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  open: boolean
  submitting: boolean
  t: (key: string, fallback?: string) => string
}

export function CreateStreamDialog(props: CreateStreamDialogProps) {
  const { name, onNameChange, onOpenChange, onSubmit, open, submitting, t } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          {t("streamsNewTitle")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("streamsNewTitle")}</DialogTitle>
          <DialogDescription>{t("streamsNewDescription")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("streamsNamePlaceholder")}</span>
            <Input value={name} onChange={(event) => onNameChange(event.target.value)} required placeholder={t("streamsNamePlaceholder")} />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("streamsCreatingButton") : t("streamsCreateButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
