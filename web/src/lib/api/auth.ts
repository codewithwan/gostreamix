import { request, setCsrfToken } from "./client"
import type { SessionResponse, SessionUser } from "./types"

export async function getSession() {
  const session = await request<SessionResponse>("/api/auth/session")
  setCsrfToken(session.csrf_token)
  return session
}

export async function setup(payload: { username: string; email: string; password: string; confirm_password: string }) {
  return request<{ message: string }>("/api/auth/setup", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function login(payload: { username: string; password: string }) {
  return request<{ user: SessionUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function logout() {
  return request<{ message: string }>("/api/auth/logout", { method: "POST" })
}

export async function changePassword(payload: { current_password: string; new_password: string }) {
  return request<{ message: string }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}
