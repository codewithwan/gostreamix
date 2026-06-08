import { describe, expect, it } from "vitest"

import type { ActivityLogEntry } from "@/lib/api"
import { buildActivityMetadata, formatActivityTime, itemHeadline, levelLabel, levelVariant, resolveActivityLevel, sourceLabel } from "@/features/activity/activity-utils"

const t = (key: string, fallback?: string, params?: Record<string, string | number>) => {
  if (params?.id) return `${key}:${params.id}`
  return fallback ?? key
}

function entry(overrides: Partial<ActivityLogEntry> = {}): ActivityLogEntry {
  return {
    timestamp: "2026-06-08T12:00:00Z",
    source: "http",
    level: "info",
    event: "request",
    message: "GET /health -> 200 OK",
    method: "GET",
    path: "/health",
    status: 200,
    latency_ms: 12,
    ip: "127.0.0.1",
    user_agent: "test",
    is_api: false,
    request_id: "req-1",
    status_text: "OK",
    ...overrides,
  }
}

describe("activity time formatting", () => {
  it("returns dash for invalid timestamps", () => {
    expect(formatActivityTime("bad timestamp")).toBe("-")
  })

  it("formats valid timestamps", () => {
    expect(formatActivityTime("2026-06-08T12:00:00Z")).not.toBe("-")
  })
})

describe("activity level resolution", () => {
  it.each([
    [entry({ level: "error", status: 200 }), "error"],
    [entry({ level: "warning", status: 200 }), "warning"],
    [entry({ level: "info", status: 500 }), "info"],
    [entry({ level: "", status: 500 }), "error"],
    [entry({ level: "", status: 404 }), "warning"],
    [entry({ level: "", status: 200 }), "info"],
    [entry({ level: " noisy ", status: 503 }), "error"],
  ])("resolves level", (item, expected) => {
    expect(resolveActivityLevel(item)).toBe(expected)
  })

  it.each([
    ["info", "success"],
    ["warning", "warning"],
    ["error", "danger"],
    ["debug", "muted"],
    ["", "muted"],
  ])("maps level variant", (level, expected) => {
    expect(levelVariant(level)).toBe(expected)
  })

  it.each([
    ["error", "activityLevelError"],
    ["warning", "activityLevelWarning"],
    ["info", "activityLevelInfo"],
    ["other", "activityLevelInfo"],
  ])("maps level label", (level, expected) => {
    expect(levelLabel(level, t)).toBe(expected)
  })
})

describe("activity source and headline", () => {
  it.each([
    [entry({ source: "ffmpeg" }), "activitySourceFFmpeg"],
    [entry({ source: "http", is_api: true }), "activityApi"],
    [entry({ source: "http", is_api: false }), "activityPage"],
    [entry({ source: "notification" }), "Notification"],
    [entry({ source: "" }), "activityUnknownSource"],
    [entry({ source: "worker" }), "worker"],
  ])("labels source", (item, expected) => {
    expect(sourceLabel(item, t)).toBe(expected)
  })

  it.each([
    [entry({ message: "custom message" }), "custom message"],
    [entry({ message: "", method: "POST", path: "/api/videos" }), "POST /api/videos"],
    [entry({ message: "", method: "", path: "", event: "stream_start" }), "stream_start"],
    [entry({ message: "", method: "", path: "", event: "" }), "activityUnknownEvent"],
  ])("builds headline", (item, expected) => {
    expect(itemHeadline(item, t)).toBe(expected)
  })
})

describe("activity metadata", () => {
  it("includes request, status, latency, stream id, ip, and event metadata", () => {
    expect(buildActivityMetadata(entry({ stream_id: "1234567890abcdef" }), t)).toEqual([
      "GET /health",
      "200 OK",
      "12 ms",
      "activityStreamHint:12345678",
      "127.0.0.1",
      "request",
    ])
  })

  it("omits empty metadata", () => {
    expect(buildActivityMetadata(entry({ method: "", path: "", status: 0, latency_ms: 0, stream_id: "", ip: "", event: "" }), t)).toEqual([])
  })
})
