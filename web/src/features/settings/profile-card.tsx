import { useState } from "react"
import { KeyRound, User } from "lucide-react"
import { toast } from "sonner"

import { changePassword } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface ProfileCardProps {
  email: string
  t: (key: string, fallback?: string) => string
  username: string
}

export function ProfileCard({ email, t, username }: ProfileCardProps) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            {t("settingsProfileTitle")}
          </CardTitle>
          <CardDescription>{t("settingsProfileDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">{t("settingsUsername")}:</span> {username || "-"}</p>
          <p><span className="text-muted-foreground">{t("settingsEmail")}:</span> {email || "-"}</p>
        </CardContent>
      </Card>

      <ChangePasswordCard t={t} />
    </div>
  )
}

function ChangePasswordCard({ t }: { t: (key: string, fallback?: string) => string }) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (next.length < 8) {
      toast.error(t("settingsPasswordTooShort", "New password must be at least 8 characters"))
      return
    }
    if (next !== confirm) {
      toast.error(t("settingsPasswordMismatch", "New password and confirmation do not match"))
      return
    }
    setSaving(true)
    try {
      await changePassword({ current_password: current, new_password: next })
      toast.success(t("settingsPasswordChanged", "Password updated"))
      setCurrent("")
      setNext("")
      setConfirm("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("settingsPasswordFailed", "Failed to change password"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" />
          {t("settingsPasswordTitle", "Change Password")}
        </CardTitle>
        <CardDescription>{t("settingsPasswordDescription", "Rotate the admin password for this account.")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-3 max-w-sm" onSubmit={handleSubmit}>
          <Field label={t("settingsCurrentPassword", "Current password")} value={current} onChange={setCurrent} autoComplete="current-password" />
          <Field label={t("settingsNewPassword", "New password")} value={next} onChange={setNext} autoComplete="new-password" />
          <Field label={t("settingsConfirmPassword", "Confirm new password")} value={confirm} onChange={setConfirm} autoComplete="new-password" />
          <Button type="submit" size="sm" disabled={saving || !current || !next || !confirm}>
            {saving ? t("settingsPasswordSaving", "Updating…") : t("settingsPasswordSubmit", "Update password")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({ label, value, onChange, autoComplete }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input type="password" value={value} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
