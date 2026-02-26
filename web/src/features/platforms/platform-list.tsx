import { SquarePen, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Platform } from "@/lib/api"
import type { TranslateFn } from "@/lib/i18n"

import { PlatformIcon } from "./platform-icon"
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
    return <p className="text-sm text-muted-foreground">{t("platformsLoading")}</p>
  }

  if (platforms.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("platformsEmpty")}</p>
  }

  return (
    <>
      <div className="grid gap-3 md:hidden">
        {platforms.map((platform) => (
          <div key={platform.id} className="rounded-md border border-border bg-muted/35 p-3">
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
        <table className="min-w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-2 py-1">{t("platformsTitle")}</th>
              <th className="px-2 py-1">{t("platformsType")}</th>
              <th className="px-2 py-1">{t("platformsTarget")}</th>
              <th className="px-2 py-1">{t("platformsStatus")}</th>
              <th className="px-2 py-1">{t("platformsActions")}</th>
            </tr>
          </thead>
          <tbody>
            {platforms.map((platform) => (
              <tr key={platform.id} className="rounded-md bg-muted/35">
                <td className="rounded-l-md px-2 py-2">
                  <div className="flex items-center gap-2 font-medium">
                    <PlatformIcon type={platform.platform_type} />
                    <span>{platform.name}</span>
                  </div>
                </td>
                <td className="px-2 py-2 text-muted-foreground">{platformTypeLabel(platform.platform_type, t)}</td>
                <td className="max-w-[240px] px-2 py-2 text-xs text-muted-foreground">
                  <span className="block truncate">{buildMaskedTarget(platform) || t("platformsIncompleteTarget")}</span>
                </td>
                <td className="px-2 py-2">
                  <Badge variant={platform.enabled ? "success" : "muted"}>{platform.enabled ? t("platformsEnabled") : t("platformsDisabled")}</Badge>
                </td>
                <td className="rounded-r-md px-2 py-2">
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
