import { FormEvent, useState } from "react"
import { Moon, Sun, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/brand/app-brand"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { login } from "@/lib/api"
import { useI18n } from "@/lib/i18n"
import { useTheme } from "@/lib/theme"

interface LoginPageProps {
  onLoginComplete: () => Promise<void>
  demo?: { username: string; password: string } | null
}

export function LoginPage({ onLoginComplete, demo }: LoginPageProps) {
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang, t } = useI18n()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [forgotOpen, setForgotOpen] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      await login({ username, password })
      toast.success(t("authLoginSuccess"))
      await onLoginComplete()
    } catch (err) {
      const message = err instanceof Error ? err.message : t("authInvalidCredentials")
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
          <CardTitle>{t("authWelcomeBack")}</CardTitle>
          <CardDescription>{t("authLoginDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {demo ? (
            <button
              type="button"
              onClick={() => { setUsername(demo.username); setPassword(demo.password) }}
              className="mb-4 flex w-full items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3 text-left transition hover:bg-primary/10"
            >
              <span className="text-lg">🎬</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{t("authDemoTitle", "Try the live demo")}</span>
                <span className="block text-xs text-muted-foreground">{t("authDemoHint", "Click to auto-fill the read-only demo account, then sign in.")}</span>
              </span>
            </button>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t("authUsernamePlaceholder")}</span>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t("authUsernamePlaceholder")}
                required
              />
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
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button className="w-full" disabled={loading}>
              {loading ? t("authSigningIn") : t("authSignIn")}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => setForgotOpen(true)}
            className="mt-3 block w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground transition"
          >
            {t("authForgotPassword", "Forgot password?")}
          </button>
        </CardContent>
      </Card>

      <ForgotPasswordDialog open={forgotOpen} onOpenChange={setForgotOpen} t={t} />
    </div>
  )
}

function ForgotPasswordDialog({ open, onOpenChange, t }: { open: boolean; onOpenChange: (open: boolean) => void; t: (key: string, fallback?: string) => string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle>{t("authForgotTitle", "Reset your password")}</DialogTitle>
          <DialogDescription>
            {t("authForgotDescription", "GoStreamix is self-hosted, so password resets run on the server for security. Run one of these commands where GoStreamix is installed, then follow the prompt.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1 text-sm">
          <CommandBlock label={t("authForgotProduction", "Production (Docker)")} command="docker compose exec gostreamix ./gostreamix --reset-password" />
          <CommandBlock label={t("authForgotBinary", "Production (binary)")} command="./gostreamix --reset-password" />
          <CommandBlock label={t("authForgotDev", "Development")} command="make reset-password" />
          <p className="text-xs text-muted-foreground">
            {t("authForgotHint", "This resets the primary administrator account. Add --set-password='newpass' to skip the interactive prompt.")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CommandBlock({ label, command }: { label: string; command: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="space-y-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-background/60 p-2">
        <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-foreground">{command}</code>
        <button type="button" onClick={copy} className="shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  )
}
