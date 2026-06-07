import type { ReactNode } from "react"
import { Languages, LogOut, Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"

interface UserMenuPanelProps {
  lang: string
  onLogoutClick: () => void
  setLang: (lang: "en" | "id") => void
  setTheme: (theme: "light" | "dark" | "system") => void
  t: (key: string, fallback?: string) => string
  theme: string
}

export function UserMenuPanel({ lang, onLogoutClick, setLang, setTheme, t, theme }: UserMenuPanelProps) {
  return (
    <>
      <p className="text-xs text-muted-foreground">{t("userMenuDescription")}</p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{t("appearance")}</p>
        <div className="flex items-center gap-1">
          <ThemeButton active={theme === "light"} label={t("light")} onClick={() => setTheme("light")} icon={<Sun className="h-4 w-4" />} />
          <ThemeButton active={theme === "dark"} label={t("dark")} onClick={() => setTheme("dark")} icon={<Moon className="h-4 w-4" />} />
          <ThemeButton active={theme === "system"} label={t("themeSystem")} onClick={() => setTheme("system")} icon={<Monitor className="h-4 w-4" />} />
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
      <Button size="sm" className="mt-3 w-full" variant="outline" onClick={onLogoutClick}>
        <LogOut className="h-4 w-4" />
        {t("logout")}
      </Button>
    </>
  )
}

function ThemeButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant={active ? "default" : "outline"} className="h-8 w-8 px-0" onClick={onClick} title={label}>
      {icon}
    </Button>
  )
}
