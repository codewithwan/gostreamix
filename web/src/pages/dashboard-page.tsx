import { useEffect, useState, type ReactNode } from "react"
import { Cpu, HardDrive, MemoryStick } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getDashboardStats } from "@/lib/api"

interface StatBlockProps {
  title: string
  value: string
  hint: string
  icon: ReactNode
}

function StatBlock({ title, value, hint, icon }: StatBlockProps) {
  return (
    <Card className="bg-card/85">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between pt-0 text-xs text-muted-foreground">
        <span>{hint}</span>
        <span className="rounded-md bg-muted p-2 text-foreground">{icon}</span>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const [cpu, setCPU] = useState(0)
  const [memory, setMemory] = useState(0)
  const [disk, setDisk] = useState(0)

  useEffect(() => {
    let mounted = true

    const loadStats = async () => {
      try {
        const stats = await getDashboardStats()
        if (!mounted) {
          return
        }

        setCPU(stats.cpu)
        setMemory(stats.memory)
        setDisk(stats.disk)
      } catch {
        if (!mounted) {
          return
        }

        setCPU(0)
        setMemory(0)
        setDisk(0)
      }
    }

    void loadStats()
    const interval = window.setInterval(() => {
      void loadStats()
    }, 5000)

    return () => {
      mounted = false
      window.clearInterval(interval)
    }
  }, [])

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">System Pulse</h1>
        <p className="text-sm text-muted-foreground">Live host telemetry for your current streaming node.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatBlock title="CPU" value={`${cpu.toFixed(1)}%`} hint="Processor utilization" icon={<Cpu className="h-4 w-4" />} />
        <StatBlock
          title="Memory"
          value={`${memory.toFixed(1)}%`}
          hint="RAM footprint"
          icon={<MemoryStick className="h-4 w-4" />}
        />
        <StatBlock title="Disk" value={`${disk.toFixed(1)}%`} hint="Storage usage" icon={<HardDrive className="h-4 w-4" />} />
      </div>
    </section>
  )
}
