import { request } from "./client"
import type { ActivityLogsResponse, MetricSample, SessionUser } from "./types"

export async function getDashboardStats() {
  return request<{ cpu: number; memory: number; disk: number }>("/api/dashboard/stats")
}

export async function getDashboardMetrics(minutes = 60) {
  return request<{ items: MetricSample[] }>(`/api/dashboard/metrics?minutes=${minutes}`)
}

export async function getActivityLogs(page = 1, perPage = 20) {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.trunc(page)) : 1
  const safePerPage = Number.isFinite(perPage) ? Math.max(1, Math.trunc(perPage)) : 20
  return request<ActivityLogsResponse>(`/api/dashboard/logs?page=${safePage}&per_page=${safePerPage}`)
}

export async function getProfile() {
  return request<SessionUser>("/api/dashboard/profile")
}
