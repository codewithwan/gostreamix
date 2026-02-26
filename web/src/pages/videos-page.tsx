import { useEffect, useState, type ChangeEvent } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { deleteVideo, getVideos, uploadVideo, type Video } from "@/lib/api"

function bytesLabel(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const loadVideos = async () => {
    setError("")
    try {
      const data = await getVideos()
      setVideos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load videos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadVideos()
  }, [])

	const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setUploading(true)
    setError("")
    try {
      await uploadVideo(file)
      await loadVideos()
      event.target.value = ""
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload video")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (videoID: string) => {
    setError("")
    try {
      await deleteVideo(videoID)
      await loadVideos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete video")
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Videos</h1>
        <p className="text-sm text-muted-foreground">Upload source assets for your stream playlists.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Video</CardTitle>
          <CardDescription>Supported by the backend ffmpeg pipeline processor.</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="inline-flex cursor-pointer items-center gap-3">
            <input type="file" accept="video/*" className="hidden" onChange={handleUpload} />
            <Button asChild disabled={uploading}>
              <span>{uploading ? "Uploading..." : "Select file"}</span>
            </Button>
          </label>
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {loading ? <p className="text-sm text-muted-foreground">Loading videos...</p> : null}

      <div className="grid gap-3 md:grid-cols-2">
        {!loading && videos.length === 0 ? <p className="text-sm text-muted-foreground">No uploaded videos yet.</p> : null}
        {videos.map((video) => (
          <Card key={video.id} className="bg-card/85">
            <CardContent className="space-y-3 pt-5">
              <div>
                <p className="truncate font-medium">{video.original_name || video.filename}</p>
                <p className="text-xs text-muted-foreground">
                  {bytesLabel(video.size)} | {video.duration}s
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="danger" onClick={() => void handleDelete(video.id)}>
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
