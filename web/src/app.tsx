import { useCallback, useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster, toast } from "sonner"

import { AppShell } from "@/components/layout/app-shell"
import { getSession, logout, type SessionResponse } from "@/lib/api"
import { I18nProvider, useI18n } from "@/lib/i18n"
import { ThemeProvider, useTheme } from "@/lib/theme"
import { ActivityPage } from "@/pages/activity-page"
import { DashboardPage } from "@/pages/dashboard-page"
import { LoginPage } from "@/pages/login-page"
import { PlatformsPage } from "@/pages/platforms-page"
import { SettingsPage } from "@/pages/settings-page"
import { SetupPage } from "@/pages/setup-page"
import { StreamEditorPage } from "@/pages/stream-editor-page"
import { StreamsPage } from "@/pages/streams-page"
import { VideosPage } from "@/pages/videos-page"

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Initializing GoStreamix workspace...
    </div>
  )
}

function AppToaster() {
  const { resolvedTheme } = useTheme()

  return <Toaster position="top-right" closeButton richColors theme={resolvedTheme === "dark" ? "dark" : "light"} />
}

function AuthenticatedRouter({ session, refreshSession }: { session: SessionResponse; refreshSession: () => Promise<void> }) {
  const { t } = useI18n()

  const handleLogout = async () => {
    try {
      await logout()
      toast.success(t("logout"))
    } catch {
      toast.error(t("logoutFailed", "Failed to logout"))
    }
    await refreshSession()
  }

  if (!session.user) {
    return <Navigate to="/login" replace />
  }

  return (
    <Routes>
      <Route element={<AppShell username={session.user.username} email={session.user.email} onLogout={handleLogout} />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/streams" element={<StreamsPage />} />
        <Route path="/streams/:streamID/editor" element={<StreamEditorPage />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/platforms" element={<PlatformsPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export function App() {
  const [session, setSession] = useState<SessionResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    const nextSession = await getSession()
    setSession(nextSession)
  }, [])

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      try {
        const nextSession = await getSession()
        if (!mounted) {
          return
        }
        setSession(nextSession)
      } catch {
        if (!mounted) {
          return
        }
        setSession({ setup: false, authenticated: false, csrf_token: "" })
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [])

  if (loading || session === null) {
    return <LoadingScreen />
  }

  return (
    <ThemeProvider>
      <I18nProvider>
        <AppToaster />
        <BrowserRouter>
          {!session.setup ? (
            <Routes>
              <Route path="/setup" element={<SetupPage onSetupComplete={refreshSession} />} />
              <Route path="*" element={<Navigate to="/setup" replace />} />
            </Routes>
          ) : null}

          {session.setup && !session.authenticated ? (
            <Routes>
              <Route path="/login" element={<LoginPage onLoginComplete={refreshSession} />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          ) : null}

          {session.setup && session.authenticated ? <AuthenticatedRouter session={session} refreshSession={refreshSession} /> : null}
        </BrowserRouter>
      </I18nProvider>
    </ThemeProvider>
  )
}
