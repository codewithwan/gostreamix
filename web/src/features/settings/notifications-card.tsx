import { Bell, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Channel } from "./settings-utils"
import { SampleNotification } from "./sample-notification"

interface ChannelRow {
  channel: Channel
  configured: boolean
  label: string
  summary: string
}

interface NotificationsCardProps {
  channelRows: ChannelRow[]
  onConfigure: (channel: Channel) => void
  onTest: (channel: Channel) => void
  t: (key: string, fallback?: string) => string
  testingChannel: Channel | ""
}

export function NotificationsCard(props: NotificationsCardProps) {
  const { channelRows, onConfigure, onTest, t, testingChannel } = props
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          {t("settingsNotificationsTitle")}
        </CardTitle>
        <CardDescription>{t("settingsNotificationsDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="grid gap-3 md:hidden">
          {channelRows.map((row) => <MobileChannelRow key={row.channel} onConfigure={onConfigure} onTest={onTest} row={row} t={t} testingChannel={testingChannel} />)}
        </div>
        <DesktopChannelTable channelRows={channelRows} onConfigure={onConfigure} onTest={onTest} t={t} testingChannel={testingChannel} />
        <SampleNotification t={t} />
      </CardContent>
    </Card>
  )
}

function MobileChannelRow({ onConfigure, onTest, row, t, testingChannel }: Omit<NotificationsCardProps, "channelRows"> & { row: ChannelRow }) {
  return (
    <div className="rounded-md border border-border bg-muted/35 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{row.label}</p>
        <Status configured={row.configured} t={t} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{row.summary}</p>
      <ActionButtons onConfigure={onConfigure} onTest={onTest} row={row} t={t} testingChannel={testingChannel} />
    </div>
  )
}

function DesktopChannelTable({ channelRows, onConfigure, onTest, t, testingChannel }: NotificationsCardProps) {
  return (
    <div className="hidden md:block">
      <table className="min-w-full border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="px-2 py-1">{t("settingsIntegration")}</th>
            <th className="px-2 py-1">{t("settingsConfiguration")}</th>
            <th className="px-2 py-1">{t("status")}</th>
            <th className="px-2 py-1">{t("settingsActions")}</th>
          </tr>
        </thead>
        <tbody>
          {channelRows.map((row) => (
            <tr key={row.channel} className="rounded-md bg-muted/35">
              <td className="rounded-l-md px-2 py-2 font-medium">{row.label}</td>
              <td className="max-w-[300px] px-2 py-2 text-xs text-muted-foreground">{row.summary}</td>
              <td className="px-2 py-2"><Status configured={row.configured} t={t} /></td>
              <td className="rounded-r-md px-2 py-2"><ActionButtons onConfigure={onConfigure} onTest={onTest} row={row} t={t} testingChannel={testingChannel} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ActionButtons({ onConfigure, onTest, row, t, testingChannel }: Omit<NotificationsCardProps, "channelRows"> & { row: ChannelRow }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0">
      <Button size="sm" variant="outline" onClick={() => onConfigure(row.channel)}>{row.configured ? t("edit") : t("add")}</Button>
      <Button size="sm" variant="outline" disabled={!row.configured || testingChannel === row.channel} onClick={() => onTest(row.channel)}>
        <Send className="h-4 w-4" />
        {testingChannel === row.channel ? t("settingsTesting") : t("settingsTest")}
      </Button>
    </div>
  )
}

function Status({ configured, t }: { configured: boolean; t: NotificationsCardProps["t"] }) {
  return configured
    ? <span className="text-xs text-green-600 dark:text-green-400">{t("settingsConnected")}</span>
    : <span className="text-xs text-muted-foreground">{t("settingsNotConfigured")}</span>
}

