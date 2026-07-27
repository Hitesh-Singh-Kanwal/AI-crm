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

/** Accepts either a number of days (relative range) or a { from, to } custom date pair (YYYY-MM-DD). */
function rangeQuery(range) {
  if (range && typeof range === 'object') {
    const from = new Date(`${range.from}T00:00:00.000Z`)
    const to = new Date(`${range.to}T23:59:59.999Z`)
    return new URLSearchParams({ from: from.toISOString(), to: to.toISOString() }).toString()
  }
  const to = new Date()
  const from = new Date(to.getTime() - range * 24 * 60 * 60 * 1000)
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
/** `range`: number of days (relative) or { from, to } (custom absolute dates). */
export function useDashboardOverview(range, { enabled = true } = {}) {
  const key = enabled ? ['dashboard-overview', range, branchKey()] : null

  return useSWR(
    key,
    ([, r]) => fetchOverview(`/api/dashboard/overview?${rangeQuery(r)}`),
    analyticsSwrConfig
  )
}

/** `range`: number of days (relative) or { from, to } (custom absolute dates). */
export function useReportsOverview(range, { enabled = true } = {}) {
  const key = enabled ? ['reports-overview', range, branchKey()] : null

  return useSWR(
    key,
    ([, r]) => fetchOverview(`/api/reports/overview?${rangeQuery(r)}`),
    analyticsSwrConfig
  )
}

export function useOwnerDashboardOverview(rangeDays, { enabled = true } = {}) {
  const key = enabled ? ['owner-dashboard-overview', rangeDays, branchKey()] : null

  return useSWR(
    key,
    ([, days]) => fetchOverview(`/api/dashboard/owner-overview?${rangeQuery(days)}`),
    analyticsSwrConfig
  )
}

/**
 * Shared shape behind every "Show full details" drill-down button — only
 * differs by which overview's detail endpoint it hits. `params` carries the
 * widget's own drill dimensions (locationID, teacherID, stageGroup, channel,
 * etc.) on top of the shared date range — only fetches once `enabled` (i.e.
 * the details modal is actually open).
 */
function useOverviewDetails(cacheKey, endpoint, { metric, range, page = 1, limit = 25, params = {}, enabled = true }) {
  const key = enabled && metric ? [cacheKey, metric, range, page, limit, params, branchKey()] : null

  return useSWR(
    key,
    ([, m, r, p, l, extra]) => {
      const qs = new URLSearchParams(rangeQuery(r))
      qs.set('metric', m)
      qs.set('page', String(p))
      qs.set('limit', String(l))
      for (const [k, v] of Object.entries(extra || {})) {
        if (v !== undefined && v !== null && v !== '') qs.set(k, v)
      }
      return fetchOverview(`${endpoint}?${qs.toString()}`)
    },
    analyticsSwrConfig
  )
}

export function useOwnerOverviewDetails(opts) {
  return useOverviewDetails('owner-overview-details', '/api/dashboard/owner-overview/details', opts)
}

export function useDashboardOverviewDetails(opts) {
  return useOverviewDetails('dashboard-overview-details', '/api/dashboard/overview/details', opts)
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
