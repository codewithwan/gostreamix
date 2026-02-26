import { FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { login } from "@/lib/api"

interface LoginPageProps {
  onLoginComplete: () => Promise<void>
}

export function LoginPage({ onLoginComplete }: LoginPageProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError("")

    try {
      await login({ username, password })
      await onLoginComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_10%,rgba(234,179,8,.14),transparent_40%),radial-gradient(circle_at_10%_85%,rgba(14,165,233,.15),transparent_40%)]" />
      <Card className="w-full max-w-md border-border bg-card/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Welcome Back</CardTitle>
          <CardDescription>Login to continue managing your broadcast pipelines.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Username" required />
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              required
            />
            {error ? <p className="text-sm text-danger">{error}</p> : null}
            <Button className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
