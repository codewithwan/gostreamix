import { LayoutDashboard, Layers, LogOut, PlaySquare, Settings, Video } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/streams", label: "Streams", icon: PlaySquare },
  { to: "/videos", label: "Videos", icon: Video },
  { to: "/platforms", label: "Platforms", icon: Layers },
  { to: "/settings", label: "Settings", icon: Settings },
]

interface AppShellProps {
  username: string
  email: string
  onLogout: () => Promise<void>
}

export function AppShell({ username, email, onLogout }: AppShellProps) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_20%,rgba(16,185,129,.14),transparent_35%),radial-gradient(circle_at_85%_0,rgba(59,130,246,.12),transparent_30%),radial-gradient(circle_at_90%_80%,rgba(245,158,11,.12),transparent_35%)]" />
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[250px_1fr] md:px-6">
        <aside className="animate-fade-in rounded-lg border border-border bg-card/70 p-4 backdrop-blur-sm">
          <div className="mb-6 space-y-1 border-b border-border pb-4">
            <p className="font-display text-2xl font-semibold tracking-tight">GoStreamix</p>
            <p className="text-xs text-muted-foreground">Broadcast control surface</p>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>

          <div className="mt-8 rounded-md border border-border bg-background/80 p-3">
            <p className="text-sm font-medium">{username}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
            <Button className="mt-3 w-full" variant="subtle" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </aside>

        <main className="animate-fade-in [animation-delay:120ms]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
