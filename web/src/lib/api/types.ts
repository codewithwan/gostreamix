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

export interface NotificationTestResult {
  channel: string
  destination: string
  method: string
  content_type: string
  payload: Record<string, string>
  sent: boolean
}

export interface TelegramChatCandidate {
  id: string
  type: string
  title: string
  username: string
  preview: string
}

export interface StreamWorkspace {
  stream: Stream
  program: {
    stream_id: string
    video_ids: string[]
    rtmp_targets: string[]
    bitrate: number
    resolution: string
    fps: number
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

export interface StreamStats {
  status: string
  started_at?: string
  last_error?: string
  last_output?: string[]
  progress?: {
    Frame?: number
    FPS?: number
    Drop?: number
    Time?: string
    Bitrate?: string
    Speed?: number
  }
}
