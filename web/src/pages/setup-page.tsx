import { FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { setup } from "@/lib/api"

interface SetupPageProps {
  onSetupComplete: () => Promise<void>
}

export function SetupPage({ onSetupComplete }: SetupPageProps) {
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
      await onSetupComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to setup system")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0,rgba(250,204,21,.15),transparent_40%),radial-gradient(circle_at_75%_95%,rgba(56,189,248,.16),transparent_40%)]" />
      <Card className="w-full max-w-md border-border bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Initial Setup</CardTitle>
          <CardDescription>Create the first administrator account to unlock GoStreamix.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" required />
            <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" required />
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              required
            />
            <Input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              type="password"
              required
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button className="w-full" disabled={loading}>
              {loading ? "Setting up..." : "Complete setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
