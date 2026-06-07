import { getCsrfToken, request } from "./client"
import type { Video } from "./types"

export const MAX_VIDEO_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024

export async function getVideos() {
  return request<Video[]>("/api/videos/")
}

export async function uploadVideo(file: File, folder = "") {
  const formData = new FormData()
  formData.append("video", file)
  if (folder.trim() !== "") {
    formData.append("folder", folder.trim())
  }

  return request<Video>("/api/videos/upload", { method: "POST", body: formData })
}

export function uploadVideoWithProgress(file: File, folder = "", onProgress?: (progress: number) => void) {
  const formData = new FormData()
  formData.append("video", file)
  if (folder.trim() !== "") {
    formData.append("folder", folder.trim())
  }

  return new Promise<Video>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/videos/upload")
    xhr.withCredentials = true

    const csrfToken = getCsrfToken()
    if (csrfToken) {
      xhr.setRequestHeader("X-CSRF-Token", csrfToken)
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    xhr.onload = () => {
      const data = parseUploadResponse(xhr.responseText)
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(uploadErrorMessage(data, xhr.status)))
        return
      }
      resolve(data as Video)
    }

    xhr.onerror = () => reject(new Error("Upload failed"))
    xhr.onabort = () => reject(new Error("Upload cancelled"))
    xhr.send(formData)
  })
}

function parseUploadResponse(responseText: string) {
  if (!responseText) {
    return null
  }
  try {
    return JSON.parse(responseText) as unknown
  } catch {
    return responseText
  }
}

function uploadErrorMessage(data: unknown, status: number) {
  return typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
    ? (data as { error: string }).error
    : `Upload failed with status ${status}`
}

export async function deleteVideo(videoID: string) {
  return request<void>(`/api/videos/${videoID}`, { method: "DELETE" })
}

export async function renameVideo(videoID: string, name: string) {
  return request<Video>(`/api/videos/${videoID}/rename`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  })
}

export async function moveVideo(videoID: string, folder: string) {
  return request<Video>(`/api/videos/${videoID}/move`, {
    method: "PATCH",
    body: JSON.stringify({ folder }),
  })
}

export async function copyVideo(videoID: string, folder: string) {
  return request<Video>(`/api/videos/${videoID}/copy`, {
    method: "POST",
    body: JSON.stringify({ folder }),
  })
}
