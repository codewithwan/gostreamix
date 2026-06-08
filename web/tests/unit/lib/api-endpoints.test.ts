import { afterEach, describe, expect, it, vi } from "vitest"

import { copyVideo, deleteVideo, getVideos, moveVideo, renameVideo, uploadVideo } from "@/lib/api"

describe("video API endpoint calls", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    ["getVideos", () => getVideos(), "/api/videos/", "GET"],
    ["deleteVideo", () => deleteVideo("video/1"), "/api/videos/video%2F1", "DELETE"],
    ["renameVideo", () => renameVideo("video/1", "Launch"), "/api/videos/video%2F1/rename", "PATCH"],
    ["moveVideo", () => moveVideo("video/1", "clips"), "/api/videos/video%2F1/move", "PATCH"],
    ["copyVideo", () => copyVideo("video/1", "clips"), "/api/videos/video%2F1/copy", "POST"],
  ])("%s uses the centralized video endpoint", async (_name, call, path, method) => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(method === "GET" ? [] : {}), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await call()

    expect(fetchMock).toHaveBeenCalledWith(path, expect.objectContaining({ method }))
  })

  it("uploads videos to the upload endpoint", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "video-1" }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await uploadVideo(new File(["content"], "clip.mp4", { type: "video/mp4" }), "clips")

    expect(fetchMock).toHaveBeenCalledWith("/api/videos/upload", expect.objectContaining({ method: "POST" }))
    expect(fetchMock.mock.calls[0][1]?.body).toBeInstanceOf(FormData)
  })
})
