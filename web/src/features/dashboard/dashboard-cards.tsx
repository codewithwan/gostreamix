import type { ReactNode } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ChartPoint } from "./dashboard-types"

interface StatBlockProps {
  title: string
  value: string
  hint: string
  icon: ReactNode
}

interface OverviewBlockProps {
  title: string
  value: string
  icon: ReactNode
}

interface TrendChartCardProps {
  title: string
  latestValue: number
  colorVar: string
  data: ChartPoint[]
  dataKey: "cpu" | "memory" | "disk"
  description: string
}

export function StatBlock({ title, value, hint, icon }: StatBlockProps) {
  return (
    <Card>
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

export function OverviewBlock({ title, value, icon }: OverviewBlockProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-5">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <span className="rounded-md bg-muted p-2 text-foreground">{icon}</span>
      </CardContent>
    </Card>
  )
}

export function TrendChartCard({ title, latestValue, colorVar, data, dataKey, description }: TrendChartCardProps) {
  const gradientID = `${dataKey}-trend-fill`

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <span className="rounded-md border border-border px-2 py-1 text-xs font-medium">{latestValue.toFixed(1)}%</span>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={`hsl(${colorVar})`} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={`hsl(${colorVar})`} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: number | undefined) => `${value ?? 0}%`} labelStyle={{ color: "hsl(var(--foreground))" }} contentStyle={{ borderRadius: 10, borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--foreground))" }} />
              <Area type="monotone" dataKey={dataKey} stroke={`hsl(${colorVar})`} fill={`url(#${gradientID})`} strokeWidth={2} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
