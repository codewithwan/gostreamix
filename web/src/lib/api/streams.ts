import { request } from "./client"
import type { Stream, StreamStats, StreamWorkspace, Video } from "./types"

type NullableStream = Omit<Stream, "rtmp_targets"> & {
  rtmp_targets?: string[] | null
}

type NullableStreamWorkspace = Omit<StreamWorkspace, "stream" | "program" | "videos" | "platforms"> & {
  stream: NullableStream
  program: Omit<StreamWorkspace["program"], "video_ids" | "rtmp_targets"> & {
    video_ids?: string[] | null
    rtmp_targets?: string[] | null
  }
  videos?: Video[] | null
  platforms?: StreamWorkspace["platforms"] | null
}

function normalizeStream(stream: NullableStream): Stream {
  return {
    ...stream,
    rtmp_targets: Array.isArray(stream.rtmp_targets) ? stream.rtmp_targets : [],
  }
}

function normalizeWorkspace(workspace: NullableStreamWorkspace): StreamWorkspace {
  return {
    ...workspace,
    stream: normalizeStream(workspace.stream),
    program: {
      ...workspace.program,
      video_ids: Array.isArray(workspace.program.video_ids) ? workspace.program.video_ids : [],
      rtmp_targets: Array.isArray(workspace.program.rtmp_targets) ? workspace.program.rtmp_targets : [],
    },
    videos: Array.isArray(workspace.videos) ? workspace.videos : [],
    platforms: Array.isArray(workspace.platforms) ? workspace.platforms : [],
  }
}

export async function getStreams() {
  const streams = await request<NullableStream[]>("/api/streams/")
  return Array.isArray(streams) ? streams.map(normalizeStream) : []
}

export async function createStream(payload: {
  name: string
  video_id: string
  rtmp_targets: string[]
  bitrate: number
  resolution: string
  fps: number
  loop: boolean
}) {
  const stream = await request<NullableStream>("/api/streams/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
  return normalizeStream(stream)
}

export async function startStream(streamID: string) {
  return request<void>(`/api/streams/${streamID}/start`, { method: "POST" })
}

export async function stopStream(streamID: string) {
  return request<void>(`/api/streams/${streamID}/stop`, { method: "POST" })
}

export async function deleteStream(streamID: string) {
  return request<void>(`/api/streams/${streamID}`, { method: "DELETE" })
}

export async function getWorkspace(streamID: string) {
  const workspace = await request<NullableStreamWorkspace>(`/api/streams/${streamID}/workspace`)
  return normalizeWorkspace(workspace)
}

export async function getStreamStats(streamID: string) {
  return request<StreamStats>(`/api/streams/${streamID}/stats`)
}

export async function applyProgram(
  streamID: string,
  payload: {
    name: string
    video_ids: string[]
    rtmp_targets: string[]
    bitrate: number
    resolution: string
    fps: number
    apply_live_now: boolean
  },
) {
  return request(`/api/streams/${streamID}/program/apply`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}
