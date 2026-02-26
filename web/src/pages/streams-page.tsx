import { FormEvent, useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createStream, deleteStream, getStreams, startStream, stopStream, type Stream } from "@/lib/api"

const NIL_UUID = "00000000-0000-0000-0000-000000000000"

function statusVariant(status: string) {
  if (status === "running") {
    return "success" as const
  }
  if (status === "error") {
    return "danger" as const
  }
  return "muted" as const
}

export function StreamsPage() {
  const [streams, setStreams] = useState<Stream[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [resolution, setResolution] = useState("1280x720")
  const [bitrate, setBitrate] = useState(3000)
  const [submitting, setSubmitting] = useState(false)

  const loadStreams = async () => {
    setError("")
    try {
      const data = await getStreams()
      setStreams(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load streams")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadStreams()
  }, [])

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError("")

    try {
      await createStream({
        name,
        video_id: NIL_UUID,
        rtmp_targets: [],
        bitrate,
        resolution,
        fps: 30,
        loop: true,
      })

      setName("")
      await loadStreams()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create stream")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStart = async (streamID: string) => {
    setError("")
    try {
      await startStream(streamID)
      await loadStreams()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start stream")
    }
  }

  const handleStop = async (streamID: string) => {
    setError("")
    try {
      await stopStream(streamID)
      await loadStreams()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop stream")
    }
  }

  const handleDelete = async (streamID: string) => {
    setError("")
    try {
      await deleteStream(streamID)
      await loadStreams()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete stream")
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Streams</h1>
        <p className="text-sm text-muted-foreground">Create and control your live broadcast projects.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Stream</CardTitle>
          <CardDescription>Create an empty project and configure queue/targets in editor.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-4" onSubmit={handleCreate}>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Project name"
              className="md:col-span-2"
            />
            <Input value={resolution} onChange={(event) => setResolution(event.target.value)} placeholder="1280x720" />
            <Input
              type="number"
              min={500}
              value={bitrate}
              onChange={(event) => setBitrate(Number(event.target.value))}
              placeholder="3000"
            />
            <Button className="md:col-span-4 md:w-fit" disabled={submitting}>
              {submitting ? "Creating..." : "Create stream"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="grid gap-3">
        {loading ? <p className="text-sm text-muted-foreground">Loading streams...</p> : null}
        {!loading && streams.length === 0 ? <p className="text-sm text-muted-foreground">No stream projects yet.</p> : null}

        {streams.map((stream) => (
          <Card key={stream.id} className="bg-card/85">
            <CardContent className="flex flex-col gap-4 pt-5 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium">{stream.name}</p>
                  <Badge variant={statusVariant(stream.status)}>{stream.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {stream.resolution} | {stream.bitrate} kbps | {stream.fps} fps
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to={`/streams/${stream.id}/editor`}>Editor</Link>
                </Button>
                <Button size="sm" onClick={() => void handleStart(stream.id)}>
                  Start
                </Button>
                <Button size="sm" variant="subtle" onClick={() => void handleStop(stream.id)}>
                  Stop
                </Button>
                <Button size="sm" variant="danger" onClick={() => void handleDelete(stream.id)}>
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
