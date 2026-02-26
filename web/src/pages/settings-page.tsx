import { useEffect, useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getProfile } from "@/lib/api"

export function SettingsPage() {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true

    const loadProfile = async () => {
      try {
        const profile = await getProfile()
        if (!mounted) {
          return
        }

        setUsername(profile.username)
        setEmail(profile.email)
      } catch (err) {
        if (!mounted) {
          return
        }

        setError(err instanceof Error ? err.message : "Failed to load profile")
      }
    }

    void loadProfile()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Workspace and operator account details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operator Profile</CardTitle>
          <CardDescription>Identity information from your current authenticated session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {error ? <p className="text-danger">{error}</p> : null}
          <p>
            <span className="text-muted-foreground">Username:</span> {username || "-"}
          </p>
          <p>
            <span className="text-muted-foreground">Email:</span> {email || "-"}
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
