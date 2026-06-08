import { render } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { VideoGrid } from "@/features/videos/video-grid"
import type { Video } from "@/lib/api"

const t = (key: string, fallback?: string) => fallback ?? key

describe("media security flow", () => {
  it("renders video previews through the authenticated file endpoint", () => {
    const video: Video = {
      id: "video-1",
      filename: "uuid.mp4",
      original_name: "Launch.mp4",
      folder: "",
      size: 1024,
      thumbnail: "",
      duration: 12,
    }

    const { container } = render(
      <VideoGrid
        loading={false}
        selectedFolder=""
        parentFolder={null}
        folders={[]}
        filteredVideos={[video]}
        selectMode={false}
        selectedVideoIDs={[]}
        selectedFolderPaths={[]}
        brokenThumbnails={{}}
        onOpenParentFolder={vi.fn()}
        onOpenFolder={vi.fn()}
        onFolderContextMenu={vi.fn()}
        onToggleFolderSelection={vi.fn()}
        onToggleSelection={vi.fn()}
        onOpenPreview={vi.fn()}
        onVideoContextMenu={vi.fn()}
        onEmptyContextMenu={vi.fn()}
        onThumbnailError={vi.fn()}
        t={t}
      />,
    )

    const videoElement = container.querySelector("video")
    expect(videoElement?.getAttribute("src")).toBe("/api/videos/video-1/file")
    expect(container.innerHTML).not.toContain("/uploads/")
  })

  it("keeps thumbnails on the public thumbnail path", () => {
    const video: Video = {
      id: "video-1",
      filename: "uuid.mp4",
      original_name: "Launch.mp4",
      folder: "",
      size: 1024,
      thumbnail: "thumb file.jpg",
      duration: 12,
    }

    const { container } = render(
      <VideoGrid
        loading={false}
        selectedFolder=""
        parentFolder={null}
        folders={[]}
        filteredVideos={[video]}
        selectMode={false}
        selectedVideoIDs={[]}
        selectedFolderPaths={[]}
        brokenThumbnails={{}}
        onOpenParentFolder={vi.fn()}
        onOpenFolder={vi.fn()}
        onFolderContextMenu={vi.fn()}
        onToggleFolderSelection={vi.fn()}
        onToggleSelection={vi.fn()}
        onOpenPreview={vi.fn()}
        onVideoContextMenu={vi.fn()}
        onEmptyContextMenu={vi.fn()}
        onThumbnailError={vi.fn()}
        t={t}
      />,
    )

    const image = container.querySelector("img")
    expect(image?.getAttribute("src")).toBe("/thumbnails/thumb%20file.jpg")
  })
})
