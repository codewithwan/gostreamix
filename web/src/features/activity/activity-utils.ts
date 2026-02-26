import { AlertTriangle, Globe2, TerminalSquare } from "lucide-react"

import type { ActivityLogEntry } from "@/lib/api"
import type { TranslateFn } from "@/lib/i18n"

export function formatActivityTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`
}

export function resolveActivityLevel(item: ActivityLogEntry) {
  const level = item.level?.toLowerCase().trim()
  if (level === "error" || level === "warning" || level === "info") {
    return level
  }

  if (item.status >= 500) {
    return "error"
  }
  if (item.status >= 400) {
    return "warning"
  }

  return "info"
}

export function levelVariant(level: string) {
  if (level === "info") {
    return "success" as const
  }
  if (level === "warning") {
    return "warning" as const
  }
  if (level === "error") {
    return "danger" as const
  }
  return "muted" as const
}

export function levelLabel(level: string, t: TranslateFn) {
  if (level === "error") {
    return t("activityLevelError")
  }
  if (level === "warning") {
    return t("activityLevelWarning")
  }
  return t("activityLevelInfo")
}

export function sourceLabel(item: ActivityLogEntry, t: TranslateFn) {
  const source = item.source?.toLowerCase().trim()
  if (source === "ffmpeg") {
    return t("activitySourceFFmpeg")
  }
  if (source === "http") {
    return item.is_api ? t("activityApi") : t("activityPage")
  }
  if (!source) {
    return t("activityUnknownSource")
  }
  return source
}

export function itemHeadline(item: ActivityLogEntry, t: TranslateFn) {
  const message = item.message?.trim()
  if (message) {
    return message
  }
  if (item.method && item.path) {
    return `${item.method} ${item.path}`
  }
  if (item.event) {
    return item.event
  }
  return t("activityUnknownEvent")
}

export function activityIcon(item: ActivityLogEntry) {
  if (item.source === "ffmpeg") {
    return TerminalSquare
  }
  const level = resolveActivityLevel(item)
  if (level === "error" || level === "warning") {
    return AlertTriangle
  }
  return Globe2
}

export function buildActivityMetadata(item: ActivityLogEntry, t: TranslateFn): string[] {
  const metadata: string[] = []

  if (item.method && item.path) {
    metadata.push(`${item.method} ${item.path}`)
  }

  if (item.status > 0) {
    const statusText = item.status_text?.trim()
    metadata.push(statusText ? `${item.status} ${statusText}` : String(item.status))
  }

  if (item.latency_ms > 0) {
    metadata.push(`${item.latency_ms} ms`)
  }

  if (item.stream_id) {
    metadata.push(t("activityStreamHint", undefined, { id: item.stream_id.slice(0, 8) }))
  }

  if (item.ip) {
    metadata.push(item.ip)
  }

  if (item.event) {
    metadata.push(item.event)
  }

  return metadata
}
