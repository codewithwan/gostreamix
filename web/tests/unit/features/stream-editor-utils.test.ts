import { describe, expect, it } from "vitest"

import { DEFAULT_TRANSFORM, OUTPUT_PROFILES, formatTime, getTransformStyle, maskRTMPTarget, reorderItems } from "@/features/stream-editor/stream-editor-utils"

describe("stream editor queue utilities", () => {
  it.each([
    [[1, 2, 3], 0, 2, [2, 3, 1]],
    [[1, 2, 3], 2, 0, [3, 1, 2]],
    [["a", "b", "c", "d"], 1, 3, ["a", "c", "d", "b"]],
    [["a", "b", "c", "d"], 3, 1, ["a", "d", "b", "c"]],
  ])("reorders items", (items, from, to, expected) => {
    expect(reorderItems(items, from, to)).toEqual(expected)
  })
})

describe("stream editor time formatting", () => {
  it.each([
    [-1, "0:00"],
    [0, "0:00"],
    [0.5, "0:00"],
    [5, "0:05"],
    [59, "0:59"],
    [60, "1:00"],
    [61, "1:01"],
    [125.9, "2:05"],
    [3600, "60:00"],
    [Number.NaN, "0:00"],
    [Number.POSITIVE_INFINITY, "0:00"],
  ])("formats %s seconds", (seconds, expected) => {
    expect(formatTime(seconds)).toBe(expected)
  })
})

describe("RTMP target masking", () => {
  it.each([
    ["", ""],
    ["rtmp://example/live/key", "rtmp://example/live/******"],
    ["rtmp://example/live/", "rtmp://example/live/"],
    ["stream-key-only", "stream-key-only"],
    [" rtmp://example/live/key ", "rtmp://example/live/******"],
    ["rtmps://server/app/abc/def", "rtmps://server/app/abc/******"],
  ])("masks %q", (target, expected) => {
    expect(maskRTMPTarget(target)).toBe(expected)
  })
})

describe("video transform styles", () => {
  it("contains the expected default transform", () => {
    expect(getTransformStyle(DEFAULT_TRANSFORM)).toEqual({
      objectFit: "contain",
      transform: "translate(0%, 0%) scale(1) rotate(0deg) scaleX(1)",
      clipPath: "inset(0% 0% 0% 0%)",
      transformOrigin: "center center",
    })
  })

  it("builds transformed cover styles", () => {
    expect(getTransformStyle({ ...DEFAULT_TRANSFORM, fit: "cover", scale: 1.5, posX: 70, posY: 40, rotation: 90, mirror: true, cropTop: 1, cropRight: 2, cropBottom: 3, cropLeft: 4 })).toEqual({
      objectFit: "cover",
      transform: "translate(20%, -10%) scale(1.5) rotate(90deg) scaleX(-1)",
      clipPath: "inset(1% 2% 3% 4%)",
      transformOrigin: "center center",
    })
  })

  it("defines expected output profiles", () => {
    expect(OUTPUT_PROFILES.map((profile) => profile.id)).toEqual(["720p30", "1080p30", "1080p60"])
  })
})
