import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { PlatformList } from "@/features/platforms/platform-list"
import type { Platform } from "@/lib/api"

const t = (key: string, fallback?: string) => fallback ?? key

describe("PlatformList", () => {
  it("renders masked targets without exposing raw stream keys", () => {
    const platform: Platform = {
      id: "platform-1",
      user_id: "user-1",
      name: "YouTube Main",
      platform_type: "youtube",
      stream_key: "****cret",
      custom_url: "",
      rtmp_url: "rtmp://a.rtmp.youtube.com/live2/****cret",
      enabled: true,
    }

    render(<PlatformList loading={false} platforms={[platform]} onEdit={vi.fn()} onDelete={vi.fn()} t={t} />)

    expect(screen.getAllByText("YouTube Main").length).toBeGreaterThan(0)
    expect(screen.getAllByText(/live2\/\*\*\*\*cret/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/abc123secret/)).not.toBeInTheDocument()
  })

  it("calls delete with the selected platform id and name", () => {
    const onDelete = vi.fn()
    const platform: Platform = {
      id: "platform-1",
      user_id: "user-1",
      name: "Twitch",
      platform_type: "twitch",
      stream_key: "****cret",
      custom_url: "",
      rtmp_url: "rtmp://live.twitch.tv/app/****cret",
      enabled: true,
    }

    render(<PlatformList loading={false} platforms={[platform]} onEdit={vi.fn()} onDelete={onDelete} t={t} />)
    fireEvent.click(screen.getAllByLabelText("delete")[0])

    expect(onDelete).toHaveBeenCalledWith("platform-1", "Twitch")
  })
})
