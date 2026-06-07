import { User } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ProfileCardProps {
  email: string
  t: (key: string, fallback?: string) => string
  username: string
}

export function ProfileCard({ email, t, username }: ProfileCardProps) {
  return (
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
  )
}
