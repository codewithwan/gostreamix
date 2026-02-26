import { FormEvent, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createPlatform, getPlatforms, removePlatform, updatePlatform, type Platform } from "@/lib/api"

const defaultDraft = {
  name: "",
  platform_type: "youtube",
  stream_key: "",
  custom_url: "",
}

export function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [draft, setDraft] = useState(defaultDraft)
  const [savingID, setSavingID] = useState("")

  const loadPlatforms = async () => {
    setError("")
    try {
      const data = await getPlatforms()
      setPlatforms(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load platforms")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPlatforms()
  }, [])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    try {
      await createPlatform(draft)
      setDraft(defaultDraft)
      await loadPlatforms()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create platform")
    }
  }

  const handleUpdate = async (platform: Platform) => {
    setSavingID(platform.id)
    setError("")
    try {
      await updatePlatform(platform.id, {
        name: platform.name,
        platform_type: platform.platform_type,
        stream_key: platform.stream_key,
        custom_url: platform.custom_url,
      })
      await loadPlatforms()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update platform")
    } finally {
      setSavingID("")
    }
  }

  const handleDelete = async (platformID: string) => {
    setError("")
    try {
      await removePlatform(platformID)
      await loadPlatforms()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete platform")
    }
  }

  const patchPlatform = (platformID: string, key: keyof Platform, value: string) => {
    setPlatforms((current) =>
      current.map((platform) => {
        if (platform.id !== platformID) {
          return platform
        }

        return {
          ...platform,
          [key]: value,
        }
      }),
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Platforms</h1>
        <p className="text-sm text-muted-foreground">Store and manage your RTMP publishing targets.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Platform</CardTitle>
          <CardDescription>Quickly register YouTube, Twitch, Facebook, or custom destinations.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreate}>
            <Input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="Platform name"
              required
            />
            <select
              className="h-10 rounded-md border border-border bg-transparent px-3 text-sm"
              value={draft.platform_type}
              onChange={(event) => setDraft((current) => ({ ...current, platform_type: event.target.value }))}
            >
              <option value="youtube">YouTube</option>
              <option value="twitch">Twitch</option>
              <option value="facebook">Facebook</option>
              <option value="custom">Custom</option>
            </select>
            <Input
              value={draft.stream_key}
              onChange={(event) => setDraft((current) => ({ ...current, stream_key: event.target.value }))}
              placeholder="Stream key"
              required
            />
            <Input
              value={draft.custom_url}
              onChange={(event) => setDraft((current) => ({ ...current, custom_url: event.target.value }))}
              placeholder="Custom URL (optional)"
            />
            <Button className="md:col-span-2 md:w-fit">Save platform</Button>
          </form>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading platforms...</p> : null}

      <div className="grid gap-3">
        {!loading && platforms.length === 0 ? <p className="text-sm text-muted-foreground">No platforms configured.</p> : null}

        {platforms.map((platform) => (
          <Card key={platform.id} className="bg-card/85">
            <CardContent className="grid gap-3 pt-5 md:grid-cols-4">
              <Input value={platform.name} onChange={(event) => patchPlatform(platform.id, "name", event.target.value)} />
              <Input
                value={platform.platform_type}
                onChange={(event) => patchPlatform(platform.id, "platform_type", event.target.value)}
              />
              <Input value={platform.stream_key} onChange={(event) => patchPlatform(platform.id, "stream_key", event.target.value)} />
              <Input value={platform.custom_url} onChange={(event) => patchPlatform(platform.id, "custom_url", event.target.value)} />
              <div className="md:col-span-4 flex flex-wrap gap-2">
                <Button size="sm" disabled={savingID === platform.id} onClick={() => void handleUpdate(platform)}>
                  {savingID === platform.id ? "Saving..." : "Update"}
                </Button>
                <Button size="sm" variant="danger" onClick={() => void handleDelete(platform.id)}>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
