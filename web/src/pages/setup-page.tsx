import { FormEvent, useState } from "react"
import { Moon, Sun, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/brand/app-brand"
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
          <BrandMark className="mb-2" iconClassName="h-7 w-7" textClassName="text-base" />
          <CardTitle>{t("setupTitle")}</CardTitle>
          <CardDescription>{t("setupDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t("authUsernamePlaceholder")}</span>
              <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder={t("authUsernamePlaceholder")} required />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t("setupEmailPlaceholder")}</span>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("setupEmailPlaceholder")} type="email" required />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t("authPasswordPlaceholder")}</span>
              <div className="relative">
                <Input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t("authPasswordPlaceholder")}
                  type={showPassword ? "text" : "password"}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t("setupConfirmPasswordPlaceholder")}</span>
              <div className="relative">
                <Input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder={t("setupConfirmPasswordPlaceholder")}
                  type={showConfirmPassword ? "text" : "password"}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
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
