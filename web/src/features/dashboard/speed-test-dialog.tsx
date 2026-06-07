import { CheckCircle2, Wifi } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { SpeedTestState } from "./dashboard-types"

const ticks = ["0", "5", "10", "50", "100", "250", "500", "750", "1000"].map((val, index) => ({
  val,
  pct: [0, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100][index],
}))

interface SpeedTestDialogProps {
  downloadSpeed: number
  gaugeVal: number
  onOpenChange: (open: boolean) => void
  onStart: () => void
  open: boolean
  ping: number
  t: (key: string, fallback?: string) => string
  testState: SpeedTestState
  uploadSpeed: number
}

export function SpeedTestDialog(props: SpeedTestDialogProps) {
  const { downloadSpeed, gaugeVal, onOpenChange, onStart, open, ping, t, testState, uploadSpeed } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border border-border rounded-lg shadow-2xl p-6 text-foreground">
        <DialogHeader className="border-b border-border pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-bold uppercase tracking-wider text-muted-foreground">
            <Wifi className="h-4 w-4 text-primary animate-pulse" />
            {t("speedtestTitle")}
          </DialogTitle>
        </DialogHeader>
        {testState === "done" ? (
          <SpeedTestResult downloadSpeed={downloadSpeed} ping={ping} t={t} uploadSpeed={uploadSpeed} />
        ) : (
          <SpeedTestRunning downloadSpeed={downloadSpeed} gaugeVal={gaugeVal} ping={ping} t={t} testState={testState} uploadSpeed={uploadSpeed} />
        )}
        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={testState !== "idle" && testState !== "done"}>
            {t("speedtestClose")}
          </Button>
          <Button onClick={onStart} disabled={testState !== "idle" && testState !== "done"} className="min-w-[100px]">
            {testState === "done" ? t("speedtestTestAgain") : t("speedtestStartTest")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SpeedTestResult({ downloadSpeed, ping, t, uploadSpeed }: Pick<SpeedTestDialogProps, "downloadSpeed" | "ping" | "t" | "uploadSpeed">) {
  return (
    <div className="py-6 flex flex-col items-center justify-center gap-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mb-1">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h3 className="text-2xl font-black tracking-widest text-emerald-500 uppercase">{t("speedtestExcellent")}</h3>
        <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed mx-auto text-center">{t("speedtestResultDesc")}</p>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full bg-muted/30 border border-border p-4 rounded-xl text-center">
        <Metric label={t("speedtestPing")} value={String(ping)} unit="ms" />
        <Metric label={t("speedtestDownload")} value={downloadSpeed.toFixed(2)} unit="Mbps" border />
        <Metric label={t("speedtestUpload")} value={uploadSpeed.toFixed(2)} unit="Mbps" />
      </div>
    </div>
  )
}

function SpeedTestRunning(props: Pick<SpeedTestDialogProps, "downloadSpeed" | "gaugeVal" | "ping" | "t" | "testState" | "uploadSpeed">) {
  const { downloadSpeed, gaugeVal, ping, t, testState, uploadSpeed } = props
  const reading = testState === "download" ? downloadSpeed.toFixed(2) : testState === "upload" ? uploadSpeed.toFixed(2) : testState === "ping" ? "..." : "0.00"

  return (
    <div className="py-6 flex flex-col items-center gap-6">
      <div className="grid grid-cols-3 gap-1 w-full text-center border-b border-border/60 pb-4">
        <HeaderMetric active={testState === "ping"} label={t("speedtestPing")} value={ping > 0 ? `${ping} ms` : "-"} />
        <HeaderMetric active={testState === "download"} label={t("speedtestDownload")} value={downloadSpeed > 0 ? `${downloadSpeed.toFixed(2)} Mbps` : "-"} />
        <HeaderMetric active={testState === "upload"} label={t("speedtestUpload")} value={uploadSpeed > 0 ? `${uploadSpeed.toFixed(2)} Mbps` : "-"} />
      </div>
      <SpeedDial gaugeVal={gaugeVal} />
      <div className="flex flex-col items-center -mt-4">
        <span className="text-4xl font-black font-mono tracking-tight text-foreground">{reading}</span>
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{stateLabel(testState, t)}</span>
      </div>
    </div>
  )
}

function HeaderMetric({ active, label, value }: { active: boolean; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
      <span className="text-base font-extrabold font-mono text-foreground mt-0.5">{value}</span>
      {active && <div className="h-0.5 w-8 bg-primary mt-1.5 animate-pulse" />}
    </div>
  )
}

function Metric({ border, label, unit, value }: { border?: boolean; label: string; unit: string; value: string }) {
  return (
    <div className={border ? "space-y-0.5 border-x border-border/85 px-2" : "space-y-0.5"}>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block text-center">{label}</span>
      <span className="text-lg font-extrabold font-mono text-primary block text-center leading-none">{value}</span>
      <span className="text-[9px] font-semibold text-muted-foreground block text-center mt-0.5">{unit}</span>
    </div>
  )
}

function SpeedDial({ gaugeVal }: { gaugeVal: number }) {
  return (
    <div className="w-56 h-36 flex flex-col items-center justify-center relative">
      <svg className="w-full h-full" viewBox="0 0 100 52">
        <path d="M 10 48 A 40 40 0 0 1 90 48" fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/20" strokeLinecap="round" />
        {ticks.map((tick) => <DialTick key={tick.val} pct={tick.pct} val={tick.val} />)}
        <path d="M 10 48 A 40 40 0 0 1 90 48" fill="none" stroke="currentColor" strokeWidth="5.5" strokeDasharray="126" strokeDashoffset={126 - (gaugeVal / 100) * 126} strokeLinecap="round" className="text-primary transition-all duration-150 ease-out" />
        <line x1="50" y1="48" x2={50 + 38 * Math.cos(Math.PI * (1 - gaugeVal / 100))} y2={48 - 38 * Math.sin(Math.PI * (1 - gaugeVal / 100))} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary transition-all duration-150 ease-out" />
        <circle cx="50" cy="48" r="2.5" className="fill-card stroke-primary stroke-[1.5]" />
      </svg>
    </div>
  )
}

function DialTick({ pct, val }: { pct: number; val: string }) {
  const angleRad = Math.PI * (1 - pct / 100)
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  return (
    <g className="text-muted-foreground/30">
      <line x1={50 + 37 * cos} y1={48 - 37 * sin} x2={50 + 40 * cos} y2={48 - 40 * sin} stroke="currentColor" strokeWidth="0.5" />
      <text x={50 + 26 * cos} y={48 - 26 * sin} fill="currentColor" fontSize="4.2" fontWeight="700" textAnchor="middle" dominantBaseline="central" className="fill-muted-foreground/60 font-sans tracking-tighter">{val}</text>
    </g>
  )
}

function stateLabel(testState: SpeedTestState, t: SpeedTestDialogProps["t"]) {
  if (testState === "ping") return t("speedtestTestingPing")
  if (testState === "download") return t("speedtestTestingDownload")
  if (testState === "upload") return t("speedtestTestingUpload")
  return t("speedtestReady")
}
