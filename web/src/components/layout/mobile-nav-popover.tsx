import { NavLink } from "react-router-dom"

import type { TranslateFn } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { navItems } from "./nav-items"

interface MobileNavPopoverProps {
  open: boolean
  onNavigate: () => void
  t: TranslateFn
}

export function MobileNavPopover({ open, onNavigate, t }: MobileNavPopoverProps) {
  if (!open) return null

  return (
    <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-xl border border-border bg-card/95 p-2 shadow-2xl backdrop-blur">
      <nav className="grid grid-cols-2 gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const labelKey = item.to.replace("/", "") || "dashboard"
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex min-w-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  isActive ? "bg-foreground text-background" : "bg-muted/45 text-foreground hover:bg-muted",
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(labelKey, item.label)}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
