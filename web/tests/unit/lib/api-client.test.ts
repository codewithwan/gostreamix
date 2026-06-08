import { afterEach, describe, expect, it, vi } from "vitest"

import { request, setCsrfToken } from "@/lib/api/client"

describe("API client", () => {
  afterEach(() => {
    setCsrfToken("")
    vi.unstubAllGlobals()
  })

  it("adds the csrf header to mutating JSON requests", async () => {
    setCsrfToken("csrf-token")
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await request("/api/example", {
      method: "POST",
      body: JSON.stringify({ name: "demo" }),
    })

    const [, init] = fetchMock.mock.calls[0]
    const headers = init?.headers as Headers
    expect(headers.get("Content-Type")).toBe("application/json")
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token")
    expect(init?.credentials).toBe("include")
  })

  it("does not add csrf headers to GET requests", async () => {
    setCsrfToken("csrf-token")
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    await request("/api/example")

    const [, init] = fetchMock.mock.calls[0]
    const headers = init?.headers as Headers
    expect(headers.has("X-CSRF-Token")).toBe(false)
  })

  it("throws the backend error message when a request fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })))

    await expect(request("/api/private")).rejects.toThrow("unauthorized")
  })
})
