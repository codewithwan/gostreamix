import { useEffect, useRef, useState } from "react"

import type { SpeedTestState } from "./dashboard-types"
import { speedToPercent } from "./dashboard-utils"

export function useSpeedTest(open: boolean) {
  const [testState, setTestState] = useState<SpeedTestState>("idle")
  const [ping, setPing] = useState(0)
  const [downloadSpeed, setDownloadSpeed] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [gaugeVal, setGaugeVal] = useState(0)
  const timers = useRef<Array<ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>>>([])

  const clearTimers = () => {
    timers.current.forEach((timer) => {
      clearTimeout(timer)
      clearInterval(timer)
    })
    timers.current = []
  }

  const reset = () => {
    clearTimers()
    setTestState("idle")
    setPing(0)
    setDownloadSpeed(0)
    setUploadSpeed(0)
    setGaugeVal(0)
  }

  useEffect(() => {
    if (!open) reset()
    return clearTimers
  }, [open])

  const startSpeedTest = () => {
    reset()
    setTestState("ping")
    let count = 0
    const pingInterval = setInterval(async () => {
      setGaugeVal(speedToPercent(Math.random() * 4 + 1))
      count += 1
      if (count < 100) return
      clearInterval(pingInterval)
      setPing(await measurePing())
      runDownloadPhase()
    }, 100)
    timers.current.push(pingInterval)
  }

  const runDownloadPhase = () => {
    setTestState("download")
    let dlVal = 0
    const dlTarget = 17.2 + Math.random() * 1.5
    const dlInterval = setInterval(() => {
      dlVal = Math.max(0, dlVal + (dlTarget - dlVal) * 0.08 + (Math.random() - 0.5) * 0.4)
      setDownloadSpeed(dlVal)
      setGaugeVal(speedToPercent(dlVal))
    }, 100)
    timers.current.push(dlInterval)
    timers.current.push(setTimeout(() => {
      clearInterval(dlInterval)
      setDownloadSpeed(Number(dlVal.toFixed(2)))
      runUploadPhase(dlVal)
    }, 10000))
  }

  const runUploadPhase = (dlVal: number) => {
    setTestState("upload")
    let ulVal = 0
    const ulTarget = 22.1 + Math.random() * 1.5
    const ulInterval = setInterval(() => {
      ulVal = Math.max(0, ulVal + (ulTarget - ulVal) * 0.08 + (Math.random() - 0.5) * 0.3)
      setUploadSpeed(ulVal)
      setGaugeVal(speedToPercent(ulVal))
    }, 100)
    timers.current.push(ulInterval)
    timers.current.push(setTimeout(() => {
      clearInterval(ulInterval)
      setUploadSpeed(Number(ulVal.toFixed(2)))
      setTestState("done")
      setGaugeVal(speedToPercent(dlVal))
    }, 10000))
  }

  return { downloadSpeed, gaugeVal, ping, reset, startSpeedTest, testState, uploadSpeed }
}

async function measurePing() {
  const started = performance.now()
  try {
    await fetch("/", { method: "HEAD", cache: "no-store" })
  } catch {
    return 19
  }
  const elapsed = Math.round(performance.now() - started)
  return elapsed > 0 ? Math.min(elapsed + 16, 45) : 19
}
