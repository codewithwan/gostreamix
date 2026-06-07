import { useEffect } from "react"
import { toast } from "sonner"
import { getStreamStats, type StreamStats } from "@/lib/api"
import type { StreamWSMessage } from "./stream-editor-types"

interface UseStreamStatusOptions {
  streamID: string
  setStats: React.Dispatch<React.SetStateAction<StreamStats | null>>
  setStatus: React.Dispatch<React.SetStateAction<string>>
}

export function useStreamStatus({ streamID, setStats, setStatus }: UseStreamStatusOptions) {
  useEffect(() => {
    let closed = false
    const loadStats = async () => {
      try {
        const nextStats = await getStreamStats(streamID)
        if (closed) return
        setStats(nextStats)
        if (nextStats.status) setStatus(nextStats.status)
      } catch {
        // Statistics are best-effort and should not break the editor.
      }
    }
    loadStats()
    const interval = window.setInterval(loadStats, 5000)
    return () => {
      closed = true
      window.clearInterval(interval)
    }
  }, [streamID, setStats, setStatus])

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`)
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as StreamWSMessage
        if (message.payload?.stream_id !== streamID) return
        if (message.type === "stream_status" && message.payload.status) {
          const status = message.payload.status
          setStatus((currentStatus) => {
            if (currentStatus !== status) {
              if (status === "running") {
                toast.success("Stream is now active & running! 🚀")
              } else if (status === "starting") {
                toast.info("Stream is starting...")
              } else if (status === "stopping") {
                toast.info("Stream is stopping...")
              } else if (status === "stopped") {
                toast.success("Stream has stopped.")
              } else if (status === "error") {
                toast.error("Stream encountered an error. ❌")
              }
            }
            return status
          })
          setStats((current) => ({ ...(current || { status }), status }))
        }
        if (message.type === "stream_progress" && message.payload.progress) {
          setStats((current) => ({ ...(current || { status: "running" }), progress: message.payload?.progress }))
        }
      } catch {
        // Ignore malformed websocket messages.
      }
    }
    return () => socket.close()
  }, [streamID, setStats, setStatus])
}
