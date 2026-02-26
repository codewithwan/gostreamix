import { FormEvent, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { setup } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { useTheme } from "@/lib/theme"

interface SetupPageProps {
  onSetupComplete: () => Promise<void>
}

export function SetupPage({ onSetupComplete }: SetupPageProps) {
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang, t } = useI18n()

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      await setup({
        username,
        email,
        password,
        confirm_password: confirmPassword,
      })
      toast.success(t("setupSuccess"))
      await onSetupComplete()
    } catch (err) {
      const message = err instanceof Error ? err.message : t("setupFailed")
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="fixed right-4 top-4">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="h-8 w-8 px-0" onClick={toggleTheme} title={theme === "dark" ? t("light") : t("dark")}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <select
            className="h-8 rounded-md border border-border bg-card px-2 text-xs"
            value={lang}
            onChange={(event) => setLang(event.target.value as "en" | "id")}
          >
            <option value="en">EN</option>
            <option value="id">ID</option>
          </select>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <img src="/web/logo.svg" alt="GoStreamix logo" className="h-7 w-7" />
            <span className="font-display text-base font-semibold">GoStreamix</span>
          </div>
          <CardTitle>{t("setupTitle")}</CardTitle>
          <CardDescription>{t("setupDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={t("authUsernamePlaceholder")}
              required
            />
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("setupEmailPlaceholder")}
              type="email"
              required
            />
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("authPasswordPlaceholder")}
              type="password"
              required
            />
            <Input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t("setupConfirmPasswordPlaceholder")}
              type="password"
              required
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button className="w-full" disabled={loading}>
              {loading ? t("setupLoading") : t("setupButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
