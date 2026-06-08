import { NavLink } from "react-router-dom"

import { cn } from "@/lib/utils"
import { navItems } from "./nav-items"

interface NavListProps {
  mobile?: boolean
  onNavigate?: () => void
  t: (key: string, fallback?: string) => string
}

export function NavList({ mobile = false, onNavigate, t }: NavListProps) {
  return (
    <>
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 items-center gap-2 rounded-md text-sm transition-colors",
                mobile ? "px-3 py-2.5" : "px-3 py-2",
                isActive ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{t(item.to.replace("/", "") || "dashboard", item.label)}</span>
          </NavLink>
        )
      })}
    </>
  )
}
