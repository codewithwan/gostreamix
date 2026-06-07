export type StreamWSMessage = {
  type: string
  payload?: {
    stream_id?: string
    status?: string
  }
}

export function statusVariant(status: string) {
  if (status === "running") {
    return "success" as const
  }
  if (status === "error") {
    return "danger" as const
  }
  if (status === "starting" || status === "stopping") {
    return "warning" as const
  }
  return "muted" as const
}
