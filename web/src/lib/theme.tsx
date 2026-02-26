import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

type Theme = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function detectSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = window.localStorage.getItem("gostreamix-theme")
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved
    }
    return "system"
  })

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => detectSystemTheme())

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")

    const applyTheme = () => {
      const finalTheme = theme === "system" ? (media.matches ? "dark" : "light") : theme
      const root = document.documentElement
      if (finalTheme === "dark") {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
      setResolvedTheme(finalTheme)
    }

    const onMediaChange = () => {
      if (theme === "system") {
        applyTheme()
      }
    }

    applyTheme()
    media.addEventListener("change", onMediaChange)
    window.localStorage.setItem("gostreamix-theme", theme)

    return () => {
      media.removeEventListener("change", onMediaChange)
    }
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (nextTheme: Theme) => setThemeState(nextTheme),
      toggleTheme: () => {
        setThemeState((current) => {
          const activeTheme = current === "system" ? resolvedTheme : current
          return activeTheme === "dark" ? "light" : "dark"
        })
      },
    }),
    [theme, resolvedTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}
