import { Card, CardContent } from "@/components/ui/card"
import type { TranslateFn } from "@/lib/i18n"

interface VideosSummaryProps {
  videoCountLabel: string
  selectedFolderLabel: string
  uploadFolderLabel: string
  t: TranslateFn
}

export function VideosSummary({ videoCountLabel, selectedFolderLabel, uploadFolderLabel, t }: VideosSummaryProps) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5 text-sm">
        <span className="text-muted-foreground">{videoCountLabel}</span>
        <span className="text-muted-foreground">{t("videosCurrentFolder", undefined, { folder: selectedFolderLabel })}</span>
        <span className="text-muted-foreground">{t("videosCurrentUploadFolder", undefined, { folder: uploadFolderLabel })}</span>
      </CardContent>
    </Card>
  )
}
