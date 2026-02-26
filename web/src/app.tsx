import { useCallback, useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import { AppShell } from "@/components/layout/app-shell"
import { getSession, logout, type SessionResponse } from "@/lib/api"
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

  const handleLogout = async () => {
    await logout()
    await refreshSession()
  }

  if (!session.setup) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/setup" element={<SetupPage onSetupComplete={refreshSession} />} />
          <Route path="*" element={<Navigate to="/setup" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  if (!session.authenticated || !session.user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage onLoginComplete={refreshSession} />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={<AppShell username={session.user.username} email={session.user.email} onLogout={handleLogout} />}
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/streams" element={<StreamsPage />} />
          <Route path="/streams/:streamID/editor" element={<StreamEditorPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/platforms" element={<PlatformsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
