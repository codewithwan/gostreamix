import { useEffect, useMemo, useRef, useState } from "react"
import { History, Languages, LayoutDashboard, Layers, LogOut, Menu, Monitor, Moon, PlaySquare, Settings, Sun, Video, X } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/streams", label: "Streams", icon: PlaySquare },
  { to: "/videos", label: "Videos", icon: Video },
  { to: "/platforms", label: "Platforms", icon: Layers },
  { to: "/activity", label: "Activity", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
]

interface AppShellProps {
  username: string
  email: string
  onLogout: () => Promise<void>
}

export function AppShell({ username, email, onLogout }: AppShellProps) {
  const { lang, setLang, t } = useI18n()
  const { theme, setTheme } = useTheme()

  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  const desktopMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)

  const initials = useMemo(() => {
    const trimmed = username.trim()
    if (!trimmed) {
      return "GS"
    }

    const parts = trimmed.split(/\s+/)
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase()
    }

    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
  }, [username])

  useEffect(() => {
    if (!userMenuOpen) {
      return
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      const inDesktop = desktopMenuRef.current?.contains(target)
      const inMobile = mobileMenuRef.current?.contains(target)
      if (!inDesktop && !inMobile) {
        setUserMenuOpen(false)
      }
    }

    window.addEventListener("mousedown", onPointerDown)
    return () => {
      window.removeEventListener("mousedown", onPointerDown)
    }
  }, [userMenuOpen])

  const handleLogoutConfirm = async () => {
    setLogoutLoading(true)
    try {
      await onLogout()
    } finally {
      setLogoutLoading(false)
      setLogoutConfirmOpen(false)
      setUserMenuOpen(false)
    }
  }

  const userMenuPanel = (
    <>
      <p className="text-xs text-muted-foreground">{t("userMenuDescription")}</p>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{t("appearance")}</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="sm"
            variant={theme === "light" ? "default" : "outline"}
            className="h-8 w-8 px-0"
            onClick={() => setTheme("light")}
            title={t("light")}
          >
            <Sun className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={theme === "dark" ? "default" : "outline"}
            className="h-8 w-8 px-0"
            onClick={() => setTheme("dark")}
            title={t("dark")}
          >
            <Moon className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={theme === "system" ? "default" : "outline"}
            className="h-8 w-8 px-0"
            onClick={() => setTheme("system")}
            title={t("themeSystem")}
          >
            <Monitor className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{t("language")}</p>
        <div className="grid grid-cols-2 gap-1">
          <Button size="sm" variant={lang === "en" ? "default" : "outline"} className="h-8 px-2 text-[11px]" onClick={() => setLang("en")}>
            <Languages className="h-3.5 w-3.5" />
            EN
          </Button>
          <Button size="sm" variant={lang === "id" ? "default" : "outline"} className="h-8 px-2 text-[11px]" onClick={() => setLang("id")}>
            <Languages className="h-3.5 w-3.5" />
            ID
          </Button>
        </div>
      </div>

      <Button size="sm" className="mt-3 w-full" variant="outline" onClick={() => setLogoutConfirmOpen(true)}>
        <LogOut className="h-4 w-4" />
        {t("logout")}
      </Button>
    </>
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="relative flex items-center justify-between" ref={mobileMenuRef}>
          <div className="flex items-center gap-2">
            <img src="/web/logo.svg" alt="GoStreamix logo" className="h-7 w-7" />
            <span className="font-display text-base font-semibold">GoStreamix</span>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 w-8 px-0" onClick={() => setMobileNavOpen(true)} aria-label={t("menu")}>
              <Menu className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" className="h-8 w-8 px-0" onClick={() => setUserMenuOpen((current) => !current)} aria-label={t("userMenu")}>
              {initials}
            </Button>
          </div>

          {userMenuOpen ? (
            <div className="absolute right-0 top-11 z-40 w-[250px] rounded-md border border-border bg-card p-3 shadow-lg">{userMenuPanel}</div>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-57px)] w-full md:h-screen md:min-h-0 md:overflow-hidden">
        <aside className="hidden w-[280px] border-r border-border bg-card md:sticky md:top-0 md:flex md:h-screen md:shrink-0 md:flex-col md:overflow-y-auto">
          <div className="flex items-center gap-3 px-5 py-5">
            <img src="/web/logo.svg" alt="GoStreamix logo" className="h-8 w-8" />
            <div>
              <p className="font-display text-xl font-semibold tracking-tight">GoStreamix</p>
              <p className="text-xs text-muted-foreground">{t("appTagline")}</p>
            </div>
          </div>

          <nav className="grid gap-1 border-t border-border px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {t(item.to.replace("/", "") || "dashboard", item.label)}
                </NavLink>
              )
            })}
          </nav>

          <div className="relative mt-auto border-t border-border px-4 py-4" ref={desktopMenuRef}>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">{initials}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{username}</p>
                  <p className="truncate text-xs text-muted-foreground">{email}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => setUserMenuOpen((current) => !current)} aria-label={t("userMenu")}>
                <Menu className="h-4 w-4" />
              </Button>
            </div>

            {userMenuOpen ? (
              <div className="absolute bottom-[72px] right-4 z-20 w-[240px] rounded-md border border-border bg-card p-3 shadow-lg">{userMenuPanel}</div>
            ) : null}
          </div>
        </aside>

        <main className="flex-1 px-4 py-5 md:h-screen md:overflow-y-auto md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>

      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogContent className="left-0 top-0 h-screen w-[82vw] max-w-[320px] translate-x-0 translate-y-0 rounded-none border-r border-border p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <div className="flex items-center gap-2">
              <img src="/web/logo.svg" alt="GoStreamix logo" className="h-7 w-7" />
              <span className="font-display text-base font-semibold">GoStreamix</span>
            </div>
            <Button size="sm" variant="outline" className="h-8 w-8 px-0" onClick={() => setMobileNavOpen(false)} aria-label={t("close")}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="grid gap-1 px-3 py-3">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {t(item.to.replace("/", "") || "dashboard", item.label)}
                </NavLink>
              )
            })}
          </nav>
        </DialogContent>
      </Dialog>

      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("logoutConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("logoutConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setLogoutConfirmOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={() => void handleLogoutConfirm()} disabled={logoutLoading}>
              <LogOut className="h-4 w-4" />
              {logoutLoading ? `${t("logout")}...` : t("logoutConfirmAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
