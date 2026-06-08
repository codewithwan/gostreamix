import { describe, expect, it } from "vitest"

import type { Platform } from "@/lib/api"
import { buildMaskedTarget, buildRTMPTarget, maskStreamKey } from "@/features/platforms/platform-utils"

describe("platform target helpers", () => {
  it("builds default RTMP targets", () => {
    expect(buildRTMPTarget("youtube", "", "stream-key")).toBe("rtmp://a.rtmp.youtube.com/live2/stream-key")
  })

  it("does not duplicate slashes for custom URLs", () => {
    expect(buildRTMPTarget("custom", "rtmp://example/live/", "key")).toBe("rtmp://example/live/key")
  })

  it("masks stream keys for display", () => {
    expect(maskStreamKey("abc123secret")).toBe("abc***ret")
  })

  it("prefers the server-provided masked RTMP URL", () => {
    const platform = {
      id: "platform-1",
      user_id: "user-1",
      name: "YouTube",
      platform_type: "youtube",
      stream_key: "****cret",
      custom_url: "",
      rtmp_url: "rtmp://a.rtmp.youtube.com/live2/****cret",
      enabled: true,
    } satisfies Platform

    expect(buildMaskedTarget(platform)).toBe("rtmp://a.rtmp.youtube.com/live2/****cret")
  })
})
