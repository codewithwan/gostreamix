import { FolderPlus, RefreshCw, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { TranslateFn } from "@/lib/i18n"

interface VideosToolbarProps {
  createFolderOpen: boolean
  onCreateFolderOpenChange: (open: boolean) => void
  newFolderName: string
  onNewFolderNameChange: (value: string) => void
  createFolderBaseLabel: string
  onCreateFolder: () => void
  uploading: boolean
  onOpenFileDialog: () => void
  onRefresh: () => void
  t: TranslateFn
}

export function VideosToolbar({
  createFolderOpen,
  onCreateFolderOpenChange,
  newFolderName,
  onNewFolderNameChange,
  createFolderBaseLabel,
  onCreateFolder,
  uploading,
  onOpenFileDialog,
  onRefresh,
  t,
}: VideosToolbarProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("videosTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("videosDescription")}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" />
          {t("refresh")}
        </Button>

        <Dialog open={createFolderOpen} onOpenChange={onCreateFolderOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <FolderPlus className="h-4 w-4" />
              {t("videosCreateFolder")}
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("videosCreateFolderTitle")}</DialogTitle>
              <DialogDescription>{t("videosCreateFolderDescription", undefined, { folder: createFolderBaseLabel })}</DialogDescription>
            </DialogHeader>

            <Input placeholder={t("videosFolderNamePlaceholder")} value={newFolderName} onChange={(event) => onNewFolderNameChange(event.target.value)} />

            <DialogFooter>
              <Button variant="outline" onClick={() => onCreateFolderOpenChange(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={onCreateFolder}>{t("create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button onClick={onOpenFileDialog} disabled={uploading}>
          <Upload className="h-4 w-4" />
          {uploading ? t("videosUploading") : t("videosBrowse")}
        </Button>
      </div>
    </div>
  )
}
