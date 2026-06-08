import { useEffect, useRef, useState } from "react"

import type { SpeedTestState } from "./dashboard-types"
import { speedToPercent } from "./dashboard-utils"

export function useSpeedTest(open: boolean) {
  const [testState, setTestState] = useState<SpeedTestState>("idle")
  const [ping, setPing] = useState(0)
  const [downloadSpeed, setDownloadSpeed] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState(0)
  const [gaugeVal, setGaugeVal] = useState(0)

  const [serverName, setServerName] = useState("")
  const [serverCountry, setServerCountry] = useState("")
  const [serverSponsor, setServerSponsor] = useState("")
  const [clientIp, setClientIp] = useState("")
  const [clientIsp, setClientIsp] = useState("")

  const activeWs = useRef<WebSocket | null>(null)
  // animated gauge value — driven by rAF loop
  const gaugeAnimRef = useRef<number | null>(null)
  const gaugeTarget = useRef(0)
  const gaugeCurrent = useRef(0)

  // Ping phase: bounce the gauge needle using a sine wave
  const pingAnimRef = useRef<number | null>(null)
  const pingPhaseActive = useRef(false)

  const stopGaugeAnim = () => {
    if (gaugeAnimRef.current !== null) {
      cancelAnimationFrame(gaugeAnimRef.current)
      gaugeAnimRef.current = null
    }
  }

  const stopPingAnim = () => {
    if (pingAnimRef.current !== null) {
      cancelAnimationFrame(pingAnimRef.current)
      pingAnimRef.current = null
    }
    pingPhaseActive.current = false
  }

  // Smoothly animate gauge toward a target using exponential easing
  const startGaugeToTarget = (target: number) => {
    stopGaugeAnim()
    gaugeTarget.current = target
    const animate = () => {
      const diff = gaugeTarget.current - gaugeCurrent.current
      if (Math.abs(diff) < 0.05) {
        gaugeCurrent.current = gaugeTarget.current
        setGaugeVal(gaugeTarget.current)
        gaugeAnimRef.current = null
        return
      }
      gaugeCurrent.current += diff * 0.12
      setGaugeVal(gaugeCurrent.current)
      gaugeAnimRef.current = requestAnimationFrame(animate)
    }
    gaugeAnimRef.current = requestAnimationFrame(animate)
  }

  // Sweep gauge to 0 and call callback when done
  const sweepToZero = (onDone: () => void) => {
    stopGaugeAnim()
    stopPingAnim()
    gaugeTarget.current = 0
    const animate = () => {
      const diff = 0 - gaugeCurrent.current
      if (Math.abs(diff) < 0.1) {
        gaugeCurrent.current = 0
        setGaugeVal(0)
        gaugeAnimRef.current = null
        onDone()
        return
      }
      gaugeCurrent.current += diff * 0.18
      setGaugeVal(gaugeCurrent.current)
      gaugeAnimRef.current = requestAnimationFrame(animate)
    }
    gaugeAnimRef.current = requestAnimationFrame(animate)
  }

  // Ping phase: bounce needle using a rising sine curve
  const startPingAnim = () => {
    stopPingAnim()
    pingPhaseActive.current = true
    const startTime = performance.now()
    const animate = () => {
      if (!pingPhaseActive.current) return
      const elapsed = (performance.now() - startTime) / 1000
      // Slowly ramp up and oscillate — looks like probing
      const base = Math.min(elapsed * 18, 55)
      const wave = Math.sin(elapsed * 3.5) * 12
      const val = Math.max(0, base + wave)
      gaugeCurrent.current = val
      setGaugeVal(val)
      pingAnimRef.current = requestAnimationFrame(animate)
    }
    pingAnimRef.current = requestAnimationFrame(animate)
  }

  const reset = () => {
    stopGaugeAnim()
    stopPingAnim()
    if (activeWs.current) {
      activeWs.current.close()
      activeWs.current = null
    }
    gaugeCurrent.current = 0
    gaugeTarget.current = 0
    setTestState("idle")
    setPing(0)
    setDownloadSpeed(0)
    setUploadSpeed(0)
    setGaugeVal(0)
    setServerName("")
    setServerCountry("")
    setServerSponsor("")
    setClientIp("")
    setClientIsp("")
  }

  useEffect(() => {
    if (!open) reset()
    return () => {
      stopGaugeAnim()
      stopPingAnim()
      if (activeWs.current) activeWs.current.close()
    }
  }, [open])

  const startSpeedTest = () => {
    reset()
    // Small delay so reset state flushes before ping starts
    setTimeout(() => {
      setTestState("ping")
      startPingAnim()

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/speedtest`
      const ws = new WebSocket(wsUrl)
      activeWs.current = ws

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as {
            phase: string
            ping?: number
            downloadSpeed?: number
            uploadSpeed?: number
            serverName?: string
            serverCountry?: string
            serverSponsor?: string
            clientIp?: string
            clientIsp?: string
          }

          const applyMeta = () => {
            if (msg.serverName) setServerName(msg.serverName)
            if (msg.serverCountry) setServerCountry(msg.serverCountry)
            if (msg.serverSponsor) setServerSponsor(msg.serverSponsor)
            if (msg.clientIp) setClientIp(msg.clientIp)
            if (msg.clientIsp) setClientIsp(msg.clientIsp)
          }

          if (msg.phase === "ping") {
            setTestState("ping")
            startPingAnim()
          } else if (msg.phase === "download") {
            // First download message = transition from ping → download
            if (msg.downloadSpeed === undefined || msg.downloadSpeed === 0) {
              // Ping result arrived → sweep to 0 then transition
              if (msg.ping !== undefined) setPing(msg.ping)
              applyMeta()
              sweepToZero(() => {
                setTestState("download")
              })
            } else {
              setTestState("download")
              if (msg.ping !== undefined) setPing(msg.ping)
              applyMeta()
              const target = speedToPercent(msg.downloadSpeed)
              gaugeTarget.current = target
              startGaugeToTarget(target)
              setDownloadSpeed(msg.downloadSpeed)
            }
          } else if (msg.phase === "upload") {
            if (msg.uploadSpeed === undefined || msg.uploadSpeed === 0) {
              // Download finished → lock final download speed → sweep to 0
              if (msg.downloadSpeed !== undefined) setDownloadSpeed(msg.downloadSpeed)
              applyMeta()
              sweepToZero(() => {
                setTestState("upload")
              })
            } else {
              setTestState("upload")
              if (msg.ping !== undefined) setPing(msg.ping)
              applyMeta()
              const target = speedToPercent(msg.uploadSpeed)
              gaugeTarget.current = target
              startGaugeToTarget(target)
              setUploadSpeed(msg.uploadSpeed)
            }
          } else if (msg.phase === "done") {
            if (msg.downloadSpeed !== undefined) setDownloadSpeed(msg.downloadSpeed)
            if (msg.uploadSpeed !== undefined) setUploadSpeed(msg.uploadSpeed)
            applyMeta()
            sweepToZero(() => {
              setTestState("done")
            })
            ws.close()
          } else if (msg.phase === "error") {
            sweepToZero(() => setTestState("done"))
            ws.close()
          }
        } catch (err) {
          console.error("failed to parse speedtest ws message", err)
        }
      }

      ws.onerror = () => {
        sweepToZero(() => setTestState("done"))
      }

      ws.onclose = () => {
        if (activeWs.current === ws) activeWs.current = null
      }
    }, 50)
  }

  return {
    downloadSpeed,
    gaugeVal,
    ping,
    reset,
    startSpeedTest,
    testState,
    uploadSpeed,
    serverName,
    serverCountry,
    serverSponsor,
    clientIp,
    clientIsp,
  }
}
