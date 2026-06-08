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
      if (count < 50) return // 50 * 100ms = 5 seconds
      clearInterval(pingInterval)
      const measured = await measurePing()
      setPing(measured)
      
      animateGaugeToZero(() => {
        void runDownloadPhase()
      })
    }, 100)
    timers.current.push(pingInterval)
  }

  const animateGaugeToZero = (callback: () => void) => {
    setGaugeVal((currentVal) => {
      let val = currentVal
      const steps = 12
      const stepVal = val / steps
      const animInterval = setInterval(() => {
        val = Math.max(0, val - stepVal)
        setGaugeVal(val)
        if (val <= 0) {
          clearInterval(animInterval)
          setGaugeVal(0)
          timers.current.push(setTimeout(callback, 400))
        }
      }, 30)
      timers.current.push(animInterval)
      return currentVal
    })
  }

  const runDownloadPhase = async () => {
    setTestState("download")
    try {
      const response = await fetch("/api/speedtest/download?size=100", { cache: "no-store" })
      if (!response.body) throw new Error("No response body")
      const reader = response.body.getReader()
      const startTime = performance.now()
      let loaded = 0
      let lastSpeed = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        loaded += value.length
        const elapsed = (performance.now() - startTime) / 1000
        if (elapsed > 0) {
          const speedMbps = (loaded * 8) / (elapsed * 1000000)
          lastSpeed = speedMbps
          setDownloadSpeed(Number(speedMbps.toFixed(2)))
          setGaugeVal(speedToPercent(speedMbps))
        }
        if (elapsed >= 5) {
          await reader.cancel()
          break
        }
      }
      setDownloadSpeed(Number(lastSpeed.toFixed(2)))
      animateGaugeToZero(() => {
        runUploadPhase(lastSpeed)
      })
    } catch {
      setDownloadSpeed(0)
      animateGaugeToZero(() => {
        runUploadPhase(0)
      })
    }
  }

  const runUploadPhase = (finalDlVal: number) => {
    setTestState("upload")
    const data = new Uint8Array(50 * 1024 * 1024)
    const xhr = new XMLHttpRequest()
    const startTime = performance.now()
    let lastSpeed = 0

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const elapsed = (performance.now() - startTime) / 1000
        if (elapsed > 0) {
          const speedMbps = (event.loaded * 8) / (elapsed * 1000000)
          lastSpeed = speedMbps
          setUploadSpeed(Number(speedMbps.toFixed(2)))
          setGaugeVal(speedToPercent(speedMbps))
          if (elapsed >= 5) {
            xhr.abort()
          }
        }
      }
    }

    xhr.onload = () => {
      const elapsed = (performance.now() - startTime) / 1000
      const speedMbps = (data.length * 8) / (elapsed * 1000000)
      setUploadSpeed(Number(speedMbps.toFixed(2)))
      setTestState("done")
      setGaugeVal(speedToPercent(finalDlVal))
    }

    xhr.onerror = xhr.onabort = () => {
      setUploadSpeed(Number(lastSpeed.toFixed(2)))
      setTestState("done")
      setGaugeVal(speedToPercent(finalDlVal))
    }

    xhr.open("POST", "/api/speedtest/upload")
    xhr.send(data)

    const uploadTimeout = setTimeout(() => {
      xhr.abort()
    }, 5500)
    timers.current.push(uploadTimeout)
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
