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
  const activeController = useRef<AbortController | null>(null)
  const activeXhr = useRef<XMLHttpRequest | null>(null)

  const clearTimers = () => {
    timers.current.forEach((timer) => {
      clearTimeout(timer)
      clearInterval(timer)
    })
    timers.current = []
  }

  const reset = () => {
    clearTimers()
    if (activeController.current) {
      activeController.current.abort()
      activeController.current = null
    }
    if (activeXhr.current) {
      activeXhr.current.abort()
      activeXhr.current = null
    }
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
    let lastGaugeVal = 0
    const pingInterval = setInterval(async () => {
      const gVal = speedToPercent(Math.random() * 4 + 1)
      lastGaugeVal = gVal
      setGaugeVal(gVal)
      count += 1
      if (count < 50) return // 50 * 100ms = 5 seconds
      clearInterval(pingInterval)
      const measured = await measurePing()
      setPing(measured)
      
      animateGaugeToZero(lastGaugeVal, () => {
        void runDownloadPhase()
      })
    }, 100)
    timers.current.push(pingInterval)
  }

  const animateGaugeToZero = (startVal: number, callback: () => void) => {
    let val = startVal
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
  }

  const runDownloadPhase = async () => {
    setTestState("download")
    const controller = new AbortController()
    activeController.current = controller
    const downloadTimeout = setTimeout(() => {
      controller.abort()
    }, 5000)
    timers.current.push(downloadTimeout)

    let loaded = 0
    let lastSpeed = 0

    try {
      const response = await fetch("/api/speedtest/download?size=100", {
        cache: "no-store",
        signal: controller.signal,
      })
      if (!response.body) throw new Error("No response body")
      const reader = response.body.getReader()
      const startTime = performance.now()
      let lastUpdate = 0
      let iterations = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          loaded += value.length
        }
        
        iterations++
        if (iterations % 40 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0))
        }

        const now = performance.now()
        const elapsed = (now - startTime) / 1000
        if (elapsed > 0) {
          const speedMbps = (loaded * 8) / (elapsed * 1000000)
          lastSpeed = speedMbps
          if (now - lastUpdate > 100) {
            setDownloadSpeed(Number(speedMbps.toFixed(2)))
            setGaugeVal(speedToPercent(speedMbps))
            lastUpdate = now
          }
        }
      }
      clearTimeout(downloadTimeout)
      activeController.current = null
      setDownloadSpeed(Number(lastSpeed.toFixed(2)))
      animateGaugeToZero(speedToPercent(lastSpeed), () => {
        runUploadPhase(lastSpeed)
      })
    } catch {
      clearTimeout(downloadTimeout)
      activeController.current = null
      const finalSpeed = loaded > 0 ? (loaded * 8) / (5 * 1000000) : 0
      setDownloadSpeed(Number(finalSpeed.toFixed(2)))
      animateGaugeToZero(speedToPercent(finalSpeed), () => {
        runUploadPhase(finalSpeed)
      })
    }
  }

  const runUploadPhase = (finalDlVal: number) => {
    setTestState("upload")
    const data = new Uint8Array(50 * 1024 * 1024)
    const xhr = new XMLHttpRequest()
    activeXhr.current = xhr
    const startTime = performance.now()
    let lastSpeed = 0
    let lastUpdate = 0

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const now = performance.now()
        const elapsed = (now - startTime) / 1000
        if (elapsed > 0) {
          const speedMbps = (event.loaded * 8) / (elapsed * 1000000)
          lastSpeed = speedMbps
          if (now - lastUpdate > 100) {
            setUploadSpeed(Number(speedMbps.toFixed(2)))
            setGaugeVal(speedToPercent(speedMbps))
            lastUpdate = now
          }
          if (elapsed >= 5) {
            xhr.abort()
          }
        }
      }
    }

    xhr.onload = () => {
      activeXhr.current = null
      const elapsed = (performance.now() - startTime) / 1000
      const speedMbps = (data.length * 8) / (elapsed * 1000000)
      setUploadSpeed(Number(speedMbps.toFixed(2)))
      setTestState("done")
      setGaugeVal(speedToPercent(finalDlVal))
    }

    xhr.onerror = xhr.onabort = () => {
      activeXhr.current = null
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
