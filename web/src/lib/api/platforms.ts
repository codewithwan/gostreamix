import { request } from "./client"
import type { Platform } from "./types"

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
  return request<void>(`/api/platforms/${platformID}`, { method: "DELETE" })
}
