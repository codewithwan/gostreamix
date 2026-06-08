import { SquarePen, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Platform } from "@/lib/api"
import type { TranslateFn } from "@/lib/i18n"

import { PlatformIcon } from "./platform-icon"
import { Skeleton } from "@/components/ui/skeleton"
import { buildMaskedTarget, platformTypeLabel } from "./platform-utils"

interface PlatformListProps {
  loading: boolean
  platforms: Platform[]
  onEdit: (platform: Platform) => void
  onDelete: (platformID: string, platformName: string) => void
  t: TranslateFn
}

export function PlatformList({ loading, platforms, onEdit, onDelete, t }: PlatformListProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  if (platforms.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("platformsEmpty")}</p>
  }

  return (
    <>
      <div className="divide-y divide-border md:hidden">
        {platforms.map((platform) => (
          <div key={platform.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-medium">
                <PlatformIcon type={platform.platform_type} />
                <span>{platform.name}</span>
              </div>
              <Badge variant={platform.enabled ? "success" : "muted"}>{platform.enabled ? t("platformsEnabled") : t("platformsDisabled")}</Badge>
            </div>

            <p className="mt-2 text-xs text-muted-foreground">{platformTypeLabel(platform.platform_type, t)}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{buildMaskedTarget(platform) || t("platformsIncompleteTarget")}</p>

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 w-8 px-0"
                title={t("edit")}
                aria-label={t("edit")}
                onClick={() => onEdit(platform)}
              >
                <SquarePen className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="h-8 w-8 px-0"
                title={t("delete")}
                aria-label={t("delete")}
                onClick={() => onDelete(platform.id, platform.name)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="border-b border-border px-2 pb-2">{t("platformsTitle")}</th>
              <th className="border-b border-border px-2 pb-2">{t("platformsType")}</th>
              <th className="border-b border-border px-2 pb-2">{t("platformsTarget")}</th>
              <th className="border-b border-border px-2 pb-2">{t("platformsStatus")}</th>
              <th className="border-b border-border px-2 pb-2">{t("platformsActions")}</th>
            </tr>
          </thead>
          <tbody>
            {platforms.map((platform) => (
              <tr key={platform.id} className="border-b border-border/70 last:border-0">
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2 font-medium">
                    <PlatformIcon type={platform.platform_type} />
                    <span>{platform.name}</span>
                  </div>
                </td>
                <td className="px-2 py-3 text-muted-foreground">{platformTypeLabel(platform.platform_type, t)}</td>
                <td className="max-w-[240px] px-2 py-3 text-xs text-muted-foreground">
                  <span className="block truncate">{buildMaskedTarget(platform) || t("platformsIncompleteTarget")}</span>
                </td>
                <td className="px-2 py-3">
                  <Badge variant={platform.enabled ? "success" : "muted"}>{platform.enabled ? t("platformsEnabled") : t("platformsDisabled")}</Badge>
                </td>
                <td className="px-2 py-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 px-0"
                      title={t("edit")}
                      aria-label={t("edit")}
                      onClick={() => onEdit(platform)}
                    >
                      <SquarePen className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      className="h-8 w-8 px-0"
                      title={t("delete")}
                      aria-label={t("delete")}
                      onClick={() => onDelete(platform.id, platform.name)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
