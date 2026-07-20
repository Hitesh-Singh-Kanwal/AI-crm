'use client'

import useSWR from 'swr'
import api from '@/lib/api'
import { getEffectiveBranch } from '@/lib/auth'

/** Shared SWR defaults — show cache instantly when revisiting tabs. */
export const analyticsSwrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60_000,
  keepPreviousData: true,
  errorRetryCount: 2,
}

function rangeQuery(rangeDays) {
  const to = new Date()
  const from = new Date(to.getTime() - rangeDays * 24 * 60 * 60 * 1000)
  return new URLSearchParams({ from: from.toISOString(), to: to.toISOString() }).toString()
}

async function fetchOverview(path) {
  const res = await api.get(path)
  if (!res.success) throw new Error(res.error || 'Request failed')
  return res.data ?? {}
}

async function fetchLayout([, page]) {
  const res = await api.get(`/api/dashboard-layout?page=${page}`)
  if (!res.success) throw new Error(res.error || 'Failed to load layout')
  return Array.isArray(res.data) ? res.data : []
}

function branchKey() {
  return typeof window !== 'undefined' ? getEffectiveBranch() || 'all' : 'all'
}

/**
 * Dashboard overview. Cache key is stable (range + branch) so navigating away
 * and back reuses data. Dates are computed at fetch time only.
 */
export function useDashboardOverview(rangeDays, { enabled = true } = {}) {
  const key = enabled ? ['dashboard-overview', rangeDays, branchKey()] : null

  return useSWR(
    key,
    ([, days]) => fetchOverview(`/api/dashboard/overview?${rangeQuery(days)}`),
    analyticsSwrConfig
  )
}

export function useReportsOverview(rangeDays, { enabled = true } = {}) {
  const key = enabled ? ['reports-overview', rangeDays, branchKey()] : null

  return useSWR(
    key,
    ([, days]) => fetchOverview(`/api/reports/overview?${rangeQuery(days)}`),
    analyticsSwrConfig
  )
}

/** Per-user widget layout for dashboard / reports customize mode. */
export function useDashboardLayout(page, { enabled = true } = {}) {
  const key = enabled && page ? ['dashboard-layout', page, branchKey()] : null
  return useSWR(key, fetchLayout, {
    ...analyticsSwrConfig,
    // Layout rarely changes from the server after first load; keep it sticky.
    revalidateIfStale: false,
    revalidateOnReconnect: false,
  })
}
