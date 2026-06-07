export interface ChartPoint {
  name: string
  cpu: number
  memory: number
  disk: number
}

export type SpeedTestState = "idle" | "ping" | "download" | "upload" | "done"
