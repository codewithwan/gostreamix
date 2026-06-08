import { describe, expect, it } from "vitest"

import { MAX_VIDEO_UPLOAD_BYTES, thumbnailFileURL, videoFileURL } from "@/lib/api"

describe("video API resource URLs", () => {
  it("builds authenticated video file URLs by video id", () => {
    expect(videoFileURL("video-123")).toBe("/api/videos/video-123/file")
  })

  it("escapes video ids before putting them in paths", () => {
    expect(videoFileURL("bad/id")).toBe("/api/videos/bad%2Fid/file")
  })

  it("builds public thumbnail URLs from filenames", () => {
    expect(thumbnailFileURL("clip thumb.jpg")).toBe("/thumbnails/clip%20thumb.jpg")
  })

  it("keeps the client upload limit aligned with the backend limit", () => {
    expect(MAX_VIDEO_UPLOAD_BYTES).toBe(2 * 1024 * 1024 * 1024)
  })
})
