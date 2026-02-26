import type { Platform } from "@/lib/api"
import type { TranslateFn } from "@/lib/i18n"

export interface PlatformDraft {
  name: string
  platform_type: string
  stream_key: string
  custom_url: string
}

export function createEmptyPlatformDraft(): PlatformDraft {
  return {
    name: "",
    platform_type: "youtube",
    stream_key: "",
    custom_url: "",
  }
}

export function platformTypeLabel(type: string, t: TranslateFn) {
  if (type === "youtube") {
    return t("platformTypeYoutube")
  }
  if (type === "twitch") {
    return t("platformTypeTwitch")
  }
  if (type === "facebook") {
    return t("platformTypeFacebook")
  }
  if (type === "tiktok") {
    return t("platformTypeTiktok")
  }
  return t("platformTypeCustom")
}

export function buildRTMPTarget(platformType: string, customURL: string, streamKey: string) {
  const type = platformType.trim().toLowerCase()
  const key = streamKey.trim()
  let base = customURL.trim()

  if (!base) {
    if (type === "youtube") {
      base = "rtmp://a.rtmp.youtube.com/live2"
    } else if (type === "twitch") {
      base = "rtmp://live.twitch.tv/app"
    } else if (type === "facebook") {
      base = "rtmps://live-api-s.facebook.com:443/rtmp"
    } else if (type === "tiktok") {
      base = "rtmp://push-rtmp-global.tiktok.com/live"
    }
  }

  if (!base) {
    return ""
  }
  if (!key) {
    return base
  }
  if (base.endsWith("/")) {
    return `${base}${key}`
  }
  return `${base}/${key}`
}

function maskStreamKey(key: string) {
  const trimmed = key.trim()
  if (trimmed.length <= 6) {
    return "***"
  }
  return `${trimmed.slice(0, 3)}***${trimmed.slice(-3)}`
}

export function buildMaskedTarget(platform: Platform) {
  const target = buildRTMPTarget(platform.platform_type, platform.custom_url, platform.stream_key)
  if (!target) {
    return ""
  }

  const key = platform.stream_key.trim()
  if (!key) {
    return target
  }
  return target.replace(key, maskStreamKey(key))
}
