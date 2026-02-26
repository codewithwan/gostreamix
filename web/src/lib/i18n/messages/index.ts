import { activityEn } from "@/lib/i18n/messages/en/activity"
import { commonEn } from "@/lib/i18n/messages/en/common"
import { dashboardEn } from "@/lib/i18n/messages/en/dashboard"
import { mediaEn } from "@/lib/i18n/messages/en/media"
import { settingsEn } from "@/lib/i18n/messages/en/settings"
import { streamsEn } from "@/lib/i18n/messages/en/streams"
import { activityId } from "@/lib/i18n/messages/id/activity"
import { commonId } from "@/lib/i18n/messages/id/common"
import { dashboardId } from "@/lib/i18n/messages/id/dashboard"
import { mediaId } from "@/lib/i18n/messages/id/media"
import { settingsId } from "@/lib/i18n/messages/id/settings"
import { streamsId } from "@/lib/i18n/messages/id/streams"

export type Lang = "en" | "id"

export const messages = {
  en: {
    ...commonEn,
    ...dashboardEn,
    ...streamsEn,
    ...mediaEn,
    ...settingsEn,
    ...activityEn,
  },
  id: {
    ...commonId,
    ...dashboardId,
    ...streamsId,
    ...mediaId,
    ...settingsId,
    ...activityId,
  },
} as const
