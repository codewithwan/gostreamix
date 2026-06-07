import type { Video } from "@/lib/api"

export interface FolderItem {
  path: string
  depth: number
  label: string
}

export interface FolderTile {
  path: string
  label: string
  childCount: number
  videoCount: number
}

export interface UploadQueueItem {
  id: string
  name: string
  progress: number
  status: "queued" | "uploading" | "done" | "error"
  error?: string
}

export type RenameTarget = { kind: "video"; video: Video; value: string } | { kind: "folder"; path: string; value: string } | null

export type DeleteTarget = { kind: "video"; video: Video } | { kind: "folder"; path: string } | { kind: "selected" } | null
