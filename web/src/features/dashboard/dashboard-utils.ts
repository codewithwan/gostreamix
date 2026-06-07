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

export function formatSampleLabel(recordedAt: string, fallbackIndex: number) {
  const date = new Date(recordedAt)
  if (Number.isNaN(date.getTime())) {
    return `#${fallbackIndex + 1}`
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function speedToPercent(speed: number): number {
  if (speed <= 0) return 0
  if (speed <= 5) return (speed / 5) * 12.5
  if (speed <= 10) return 12.5 + ((speed - 5) / 5) * 12.5
  if (speed <= 50) return 25 + ((speed - 10) / 40) * 12.5
  if (speed <= 100) return 37.5 + ((speed - 50) / 50) * 12.5
  if (speed <= 250) return 50 + ((speed - 100) / 150) * 12.5
  if (speed <= 500) return 62.5 + ((speed - 250) / 250) * 12.5
  if (speed <= 750) return 75 + ((speed - 500) / 250) * 12.5
  if (speed <= 1000) return 87.5 + ((speed - 750) / 250) * 12.5
  return 100
}
