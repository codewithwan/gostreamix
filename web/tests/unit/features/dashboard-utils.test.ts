import { describe, expect, it } from "vitest"

import { formatSampleLabel, speedToPercent, statusVariant } from "@/features/dashboard/dashboard-utils"

describe("dashboard status variants", () => {
  it.each([
    ["running", "success"],
    ["error", "danger"],
    ["starting", "warning"],
    ["stopping", "warning"],
    ["stopped", "muted"],
    ["unknown", "muted"],
    ["", "muted"],
  ])("maps %q to %q", (status, expected) => {
    expect(statusVariant(status)).toBe(expected)
  })
})

describe("dashboard sample labels", () => {
  it("uses fallback index for invalid dates", () => {
    expect(formatSampleLabel("not a date", 3)).toBe("#4")
  })

  it("returns a localized time for valid dates", () => {
    expect(formatSampleLabel("2026-06-08T12:34:00Z", 0)).not.toBe("#1")
  })
})

describe("speed gauge mapping", () => {
  it.each([
    [-10, 0],
    [0, 0],
    [1, 2.5],
    [5, 12.5],
    [7.5, 18.75],
    [10, 25],
    [30, 31.25],
    [50, 37.5],
    [75, 43.75],
    [100, 50],
    [175, 56.25],
    [250, 62.5],
    [375, 68.75],
    [500, 75],
    [625, 81.25],
    [750, 87.5],
    [875, 93.75],
    [1000, 100],
    [1200, 100],
  ])("maps speed %s to %s percent", (speed, expected) => {
    expect(speedToPercent(speed)).toBe(expected)
  })
})
