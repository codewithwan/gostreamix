import type { CSSProperties } from "react"
import type { ClipTransform, OutputProfile } from "./stream-editor-types"

export const OUTPUT_PROFILES: OutputProfile[] = [
  { id: "720p30", label: "720p30", resolution: "1280x720", bitrate: 2500, fps: 30 },
  { id: "1080p30", label: "1080p30", resolution: "1920x1080", bitrate: 4500, fps: 30 },
  { id: "1080p60", label: "1080p60", resolution: "1920x1080", bitrate: 6000, fps: 60 },
]

export const DEFAULT_TRANSFORM: ClipTransform = {
  fit: "contain",
  scale: 1,
  posX: 50,
  posY: 50,
  cropTop: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRight: 0,
  mirror: false,
  rotation: 0,
}

export function reorderItems<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items]
  const [item] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, item)
  return next
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00"
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${String(rest).padStart(2, "0")}`
}

export function maskRTMPTarget(target: string): string {
  const trimmed = target.trim()
  const lastSlash = trimmed.lastIndexOf("/")
  if (lastSlash === -1 || lastSlash >= trimmed.length - 1) return trimmed
  return `${trimmed.slice(0, lastSlash + 1)}******`
}

export function getTransformStyle(transform: ClipTransform): CSSProperties {
  return {
    objectFit: transform.fit === "cover" ? "cover" : "contain",
    transform: `translate(${transform.posX - 50}%, ${transform.posY - 50}%) scale(${transform.scale}) rotate(${transform.rotation}deg) scaleX(${transform.mirror ? -1 : 1})`,
    clipPath: `inset(${transform.cropTop}% ${transform.cropRight}% ${transform.cropBottom}% ${transform.cropLeft}%)`,
    transformOrigin: "center center",
  }
}
