import { FormEvent, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { applyProgram, getWorkspace } from "@/lib/api"

export function StreamEditorPage() {
  const navigate = useNavigate()
  const { streamID = "" } = useParams<{ streamID: string }>()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [videoIDs, setVideoIDs] = useState<string[]>([])
  const [availableVideos, setAvailableVideos] = useState<Array<{ id: string; filename: string }>>([])
  const [targets, setTargets] = useState("")
  const [bitrate, setBitrate] = useState(3000)
  const [resolution, setResolution] = useState("1280x720")

  const recommendedTargets = useMemo(() => {
    const lines = targets
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)

    return lines.length
  }, [targets])

  useEffect(() => {
    let mounted = true

    const loadWorkspace = async () => {
      setLoading(true)
      setError("")

      try {
        const workspace = await getWorkspace(streamID)
        if (!mounted) {
          return
        }

        setName(workspace.stream.name)
        setVideoIDs(workspace.program.video_ids)
        setAvailableVideos(workspace.videos.map((video) => ({ id: video.id, filename: video.filename })))
        setTargets(workspace.program.rtmp_targets.join("\n"))
        setBitrate(workspace.program.bitrate)
        setResolution(workspace.program.resolution)
      } catch (err) {
        if (!mounted) {
          return
        }
        setError(err instanceof Error ? err.message : "Failed to load stream workspace")
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void loadWorkspace()

    return () => {
      mounted = false
    }
  }, [streamID])

  const toggleVideo = (id: string) => {
    setVideoIDs((current) => (current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError("")

    try {
      const cleanTargets = targets
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)

      await applyProgram(streamID, {
        name,
        video_ids: videoIDs,
        rtmp_targets: cleanTargets,
        bitrate,
        resolution,
        apply_live_now: true,
      })

      navigate("/streams")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply program")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Stream Editor</h1>
          <p className="text-sm text-muted-foreground">Configure queue, outputs, and quality profile in one place.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/streams")}>Back to streams</Button>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading workspace...</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {!loading ? (
        <form className="grid gap-4 lg:grid-cols-[1fr_1fr]" onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Program Identity</CardTitle>
              <CardDescription>Set project metadata and quality profile.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Stream name" required />
              <Input
                type="number"
                min={500}
                value={bitrate}
                onChange={(event) => setBitrate(Number(event.target.value))}
                placeholder="Bitrate"
              />
              <Input value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="Resolution" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>RTMP Targets</CardTitle>
              <CardDescription>One target per line. Currently {recommendedTargets} destination(s).</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="h-44 w-full rounded-md border border-border bg-transparent p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                value={targets}
                onChange={(event) => setTargets(event.target.value)}
                placeholder="rtmp://..."
                required
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Video Queue</CardTitle>
              <CardDescription>Select one or more videos. Order follows your selected list.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {availableVideos.length === 0 ? <p className="text-sm text-muted-foreground">No uploaded videos found.</p> : null}
                {availableVideos.map((video) => (
                  <label key={video.id} className="flex items-center gap-2 rounded-md border border-border p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={videoIDs.includes(video.id)}
                      onChange={() => toggleVideo(video.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                    <span className="truncate">{video.filename}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <Button disabled={saving}>{saving ? "Applying..." : "Save and apply"}</Button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
