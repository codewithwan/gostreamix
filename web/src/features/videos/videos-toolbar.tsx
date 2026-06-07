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
import { cn } from "@/lib/utils"

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
  isRefreshing: boolean
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
  isRefreshing,
  t,
}: VideosToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{t("videosTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("videosDescription")}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
        <Button variant="outline" onClick={onRefresh} disabled={isRefreshing} className="min-w-0 px-2 sm:px-3">
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          <span className="hidden sm:inline">{t("refresh")}</span>
        </Button>

        <Dialog open={createFolderOpen} onOpenChange={onCreateFolderOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" className="min-w-0 px-2 sm:px-3">
              <FolderPlus className="h-4 w-4" />
              <span className="truncate">{t("videosCreateFolder")}</span>
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("videosCreateFolderTitle")}</DialogTitle>
              <DialogDescription>{t("videosCreateFolderDescription", undefined, { folder: createFolderBaseLabel })}</DialogDescription>
            </DialogHeader>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t("videosFolderNamePlaceholder")}</span>
              <Input placeholder={t("videosFolderNamePlaceholder")} value={newFolderName} onChange={(event) => onNewFolderNameChange(event.target.value)} />
            </label>

            <DialogFooter>
              <Button variant="outline" onClick={() => onCreateFolderOpenChange(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={onCreateFolder}>{t("create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button onClick={onOpenFileDialog} disabled={uploading} className="min-w-0 px-2 sm:px-3">
          <Upload className="h-4 w-4" />
          <span className="truncate">{uploading ? t("videosUploading") : t("videosBrowse")}</span>
        </Button>
      </div>
    </div>
  )
}
