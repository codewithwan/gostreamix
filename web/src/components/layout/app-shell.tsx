import { useEffect, useMemo, useRef, useState } from "react"
import { LogOut, Menu, X } from "lucide-react"
import { Outlet, useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n"
import { useTheme } from "@/lib/theme"
import { cn } from "@/lib/utils"
import { NavList } from "./nav-list"
import { UserMenuPanel } from "./user-menu-panel"

interface AppShellProps {
  username: string
  email: string
  onLogout: () => Promise<void>
}

export function AppShell({ username, email, onLogout }: AppShellProps) {
  const { lang, setLang, t } = useI18n()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const isStudio = location.pathname.includes("/editor")

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

  const userMenuPanel = <UserMenuPanel lang={lang} setLang={setLang} setTheme={setTheme} t={t} theme={theme} onLogoutClick={() => setLogoutConfirmOpen(true)} />

  return (
    <div className={cn("bg-background text-foreground", isStudio ? "h-screen overflow-hidden flex flex-col" : "min-h-screen")}>
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:hidden shrink-0">
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

      <div className={cn("flex w-full md:h-screen md:min-h-0 md:overflow-hidden", isStudio ? "h-[calc(100dvh-57px)] overflow-hidden" : "min-h-[calc(100vh-57px)]")}>
        <aside className="hidden w-[240px] border-r border-border bg-card md:sticky md:top-0 md:flex md:h-screen md:shrink-0 md:flex-col md:overflow-y-auto lg:w-[260px]">
          <div className="flex min-w-0 items-center gap-3 px-4 py-4 lg:px-5 lg:py-5">
            <img src="/web/logo.svg" alt="GoStreamix logo" className="h-8 w-8 shrink-0" />
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold tracking-tight">GoStreamix</p>
              <p className="text-xs text-muted-foreground">{t("appTagline")}</p>
            </div>
          </div>

          <nav className="grid gap-1 border-t border-border px-3 py-4">
            <NavList t={t} />
          </nav>

          <div className="relative mt-auto border-t border-border px-3 py-3 lg:px-4 lg:py-4" ref={desktopMenuRef}>
            <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{initials}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{username}</p>
                  <p className="truncate text-xs text-muted-foreground">{email}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-8 shrink-0 px-2" onClick={() => setUserMenuOpen((current) => !current)} aria-label={t("userMenu")}>
                <Menu className="h-4 w-4" />
              </Button>
            </div>

            {userMenuOpen ? (
              <div className="absolute bottom-[68px] left-3 right-3 z-20 rounded-md border border-border bg-card p-3 shadow-lg lg:left-auto lg:right-4 lg:w-[240px]">{userMenuPanel}</div>
            ) : null}
          </div>
        </aside>

        <main
          className={cn(
            "min-w-0 flex-1",
            isStudio
              ? "h-[calc(100dvh-57px)] md:h-screen overflow-hidden p-0"
              : "px-4 py-5 md:h-screen md:overflow-y-auto md:px-6 md:py-6 lg:px-8 lg:py-8",
          )}
        >
          <Outlet />
        </main>
      </div>

      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogContent className="left-0 top-0 flex h-[100dvh] w-[min(86vw,320px)] max-w-none translate-x-0 translate-y-0 flex-col rounded-none border-l-0 border-r border-border p-0 [&>button.absolute]:hidden">
          <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border px-4 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <img src="/web/logo.svg" alt="GoStreamix logo" className="h-7 w-7 shrink-0" />
              <span className="truncate font-display text-base font-semibold">GoStreamix</span>
            </div>
            <Button size="sm" variant="outline" className="h-8 w-8 px-0" onClick={() => setMobileNavOpen(false)} aria-label={t("close")}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <nav className="grid gap-1 overflow-y-auto px-3 py-3">
            <NavList t={t} onNavigate={() => setMobileNavOpen(false)} />
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
