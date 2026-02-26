export interface SessionUser {
  id: string
  username: string
  email: string
}

export interface SessionResponse {
  setup: boolean
  authenticated: boolean
  csrf_token: string
  user?: SessionUser
}

export interface Stream {
  id: string
  video_id: string
  name: string
  rtmp_targets: string[]
  bitrate: number
  resolution: string
  fps: number
  loop: boolean
  status: string
}

export interface Video {
  id: string
  filename: string
  original_name?: string
  folder?: string
  size: number
  thumbnail: string
  duration: number
}

export interface Platform {
  id: string
  user_id: string
  name: string
  platform_type: string
  stream_key: string
  custom_url: string
  color?: string
  enabled: boolean
}

export interface MetricSample {
  cpu: number
  memory: number
  disk: number
  recorded_at: string
}

export interface ActivityLogEntry {
  timestamp: string
  source: string
  level: string
  event: string
  message: string
  stream_id?: string
  method: string
  path: string
  status: number
  latency_ms: number
  ip: string
  user_agent: string
  is_api: boolean
  request_id: string
  status_text: string
}

export interface ActivityLogsResponse {
  items: ActivityLogEntry[]
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface NotificationSettings {
  id?: number
  discord_webhook: string
  telegram_bot_token: string
  telegram_chat_id: string
}

export interface StreamWorkspace {
  stream: Stream
  program: {
    stream_id: string
    video_ids: string[]
    rtmp_targets: string[]
    bitrate: number
    resolution: string
  }
  videos: Video[]
  platforms: Array<{
    id: string
    name: string
    type: string
    rtmp_url: string
    enabled: boolean
    stream_key: string
  }>
}

let csrfToken = ""

function setCsrfToken(token: string) {
  csrfToken = token
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase()
  const headers = new Headers(init.headers)

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(method) && csrfToken && !headers.has("X-CSRF-Token")) {
    headers.set("X-CSRF-Token", csrfToken)
  }

  const response = await fetch(path, {
    credentials: "include",
    ...init,
    method,
    headers,
  })

  const raw = await response.text()
  let data: unknown = null
  if (raw) {
    try {
      data = JSON.parse(raw) as unknown
    } catch {
      data = raw
    }
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed with status ${response.status}`

    throw new Error(message)
  }

  return data as T
}

export async function getSession() {
  const session = await request<SessionResponse>("/api/auth/session")
  setCsrfToken(session.csrf_token)
  return session
}

export async function setup(payload: { username: string; email: string; password: string; confirm_password: string }) {
  return request<{ message: string }>("/api/auth/setup", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function login(payload: { username: string; password: string }) {
  return request<{ user: SessionUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function logout() {
  return request<{ message: string }>("/api/auth/logout", {
    method: "POST",
  })
}

export async function getDashboardStats() {
  return request<{ cpu: number; memory: number; disk: number }>("/api/dashboard/stats")
}

export async function getDashboardMetrics(minutes = 60) {
  return request<{ items: MetricSample[] }>(`/api/dashboard/metrics?minutes=${minutes}`)
}

export async function getActivityLogs(page = 1, perPage = 20) {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1
  const safePerPage = Number.isFinite(perPage) ? Math.max(1, Math.trunc(perPage)) : 20
  return request<ActivityLogsResponse>(`/api/dashboard/logs?page=${safePage}&per_page=${safePerPage}`)
}

export async function getProfile() {
  return request<SessionUser>("/api/dashboard/profile")
}

export async function getStreams() {
  return request<Stream[]>("/api/streams/")
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
  return request<Stream>("/api/streams/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
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
  return request<StreamWorkspace>(`/api/streams/${streamID}/workspace`)
}

export async function applyProgram(
  streamID: string,
  payload: {
    name: string
    video_ids: string[]
    rtmp_targets: string[]
    bitrate: number
    resolution: string
    apply_live_now: boolean
  },
) {
  return request(`/api/streams/${streamID}/program/apply`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function getVideos() {
  return request<Video[]>("/api/videos/")
}

export async function uploadVideo(file: File, folder = "") {
  const formData = new FormData()
  formData.append("video", file)
  if (folder.trim() !== "") {
    formData.append("folder", folder.trim())
  }

  return request<Video>("/api/videos/upload", {
    method: "POST",
    body: formData,
  })
}

export async function deleteVideo(videoID: string) {
  return request<void>(`/api/videos/${videoID}`, { method: "DELETE" })
}

export async function getPlatforms() {
  return request<Platform[]>("/api/platforms/")
}

export async function createPlatform(payload: {
  name: string
  platform_type: string
  stream_key: string
  custom_url: string
}) {
  return request<Platform>("/api/platforms/", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updatePlatform(
  platformID: string,
  payload: {
    name: string
    platform_type: string
    stream_key: string
    custom_url: string
  },
) {
  return request<Platform>(`/api/platforms/${platformID}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function removePlatform(platformID: string) {
  return request<void>(`/api/platforms/${platformID}`, {
    method: "DELETE",
  })
}

export async function getNotificationSettings() {
  return request<NotificationSettings>("/api/settings/notifications/")
}

export async function saveNotificationSettings(payload: NotificationSettings) {
  return request<NotificationSettings>("/api/settings/notifications/", {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function sendNotificationTest(message: string) {
  return request<{ message: string }>("/api/settings/notifications/test", {
    method: "POST",
    body: JSON.stringify({ message }),
  })
}
