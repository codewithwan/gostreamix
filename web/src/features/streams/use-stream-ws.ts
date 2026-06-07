import { useEffect } from "react";
import { toast } from "sonner";

import type { Stream } from "@/lib/api";
import type { StreamWSMessage } from "./stream-utils";

export function useStreamWS(
  setStreams: React.Dispatch<React.SetStateAction<Stream[]>>,
) {
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as StreamWSMessage;
        if (
          message.type !== "stream_status" ||
          !message.payload?.stream_id ||
          !message.payload.status
        )
          return;
        const { stream_id, status } = message.payload;
        setStreams((current) => {
          const match = current.find((s) => s.id === stream_id);
          if (match && match.status !== status) {
            const name = match.name;
            if (status === "running")
              toast.success(`Stream "${name}" is now active & running.`);
            else if (status === "starting")
              toast.info(`Stream "${name}" is starting...`);
            else if (status === "stopping")
              toast.info(`Stream "${name}" is stopping...`);
            else if (status === "stopped")
              toast.success(`Stream "${name}" has stopped.`);
            else if (status === "error")
              toast.error(`Stream "${name}" encountered an error.`);
          }
          return current.map((s) =>
            s.id === stream_id ? { ...s, status: status || s.status } : s,
          );
        });
      } catch {
        // Ignore malformed websocket frames.
      }
    };

    return () => socket.close();
  }, [setStreams]);
}
