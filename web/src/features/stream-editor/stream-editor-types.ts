import type { StreamStats } from "@/lib/api"

export interface EditorVideo {
  id: string
  filename: string
  source: string
  thumbnail: string
  folder: string
  duration: number
}

export interface PlatformTarget {
  id: string
  name: string
  type: string
  rtmp_url: string
  enabled: boolean
}

export interface OutputProfile {
  id: string
  label: string
  resolution: string
  bitrate: number
  fps: number
}

export interface ClipTransform {
  fit: "contain" | "cover"
  scale: number
  posX: number
  posY: number
  cropTop: number
  cropBottom: number
  cropLeft: number
  cropRight: number
  mirror: boolean
  rotation: number
}

export type ClipTransforms = Record<number, ClipTransform>

export type MobileEditorTab = "library" | "timeline"

export interface TimelineRange {
  start: number
  end: number
}

export interface StreamWSMessage {
  type: string
  payload?: {
    stream_id?: string
    status?: string
    progress?: StreamStats["progress"]
  }
}
