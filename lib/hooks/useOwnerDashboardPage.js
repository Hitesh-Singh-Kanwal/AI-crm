'use client'

import { useMemo } from 'react'
import { useOwnerDashboardOverview, useDashboardOverview } from './useAnalyticsOverview'

const DAY_MS = 24 * 60 * 60 * 1000

/** YYYY-MM-DD — the shape rangeQuery() in useAnalyticsOverview expects for custom ranges. */
function isoDay(d) {
  return d.toISOString().slice(0, 10)
}

/**
 * Normalises either supported range shape (a number of days, or a
 * { from, to } YYYY-MM-DD pair) into concrete Date bounds so we can derive
 * the two comparison windows from it.
 */
function resolveWindow(range) {
  if (range && typeof range === 'object') {
    return { from: new Date(`${range.from}T00:00:00.000Z`), to: new Date(`${range.to}T23:59:59.999Z`) }
  }
  const to = new Date()
  const from = new Date(to.getTime() - (Number(range) || 30) * DAY_MS)
  return { from, to }
}

/**
 * The two comparison windows behind every MoM / YoY badge on this page:
 *
 *  - prior period — the same number of days immediately before the current
 *    window (so a 30-day view compares against the previous 30 days).
 *  - prior year   — the exact same calendar window, one year earlier.
 *
 * Both are plain owner-overview calls with explicit { from, to } bounds, so
 * they hit the same endpoint, the same SWR cache, and the same permission
 * filtering as the primary request — no new backend surface is needed.
 */
function comparisonWindows(range) {
  const { from, to } = resolveWindow(range)
  const lengthMs = Math.max(to.getTime() - from.getTime(), DAY_MS)

  const prevTo = new Date(from.getTime() - DAY_MS)
  const prevFrom = new Date(prevTo.getTime() - lengthMs)

  const yearFrom = new Date(from)
  yearFrom.setFullYear(yearFrom.getFullYear() - 1)
  const yearTo = new Date(to)
  yearTo.setFullYear(yearTo.getFullYear() - 1)

  return {
    priorPeriod: { from: isoDay(prevFrom), to: isoDay(prevTo) },
    priorYear: { from: isoDay(yearFrom), to: isoDay(yearTo) },
  }
}

const sum = (rows, key) => (rows || []).reduce((acc, r) => acc + (Number(r?.[key]) || 0), 0)

/**
 * Flattens one owner-overview payload into the scalar headline metrics the
 * scorecard compares period-over-period. Returns `null` for a metric whose
 * section the caller has no permission for, so a missing section reads as
 * "hidden", never as a real zero.
 */
export function summarize(data) {
  if (!data) return null
  const { revenue, lessons, funnel, studentHealth } = data

  const utilization = (lessons?.instructorUtilization || []).filter((t) => t.weeklyCapacity > 0)
  const capacityPerWeek = sum(utilization, 'weeklyCapacity')
  const actualPerWeek = sum(utilization, 'actualPerWeek')

  return {
    revenue: revenue ? sum(revenue.byStudio, 'revenue') : null,
    outstanding: revenue ? Number(revenue.totalOutstanding) || 0 : null,
    lessons: lessons ? sum(lessons.byStudio, 'count') : null,
    scheduled: lessons ? sum(lessons.forecastByStudio, 'scheduled') : null,
    leads: funnel ? Number(funnel.report1?.leadCount) || 0 : null,
    introsBooked: funnel ? Number(funnel.report1?.introBookedCount) || 0 : null,
    introsTaught: funnel ? Number(funnel.report2?.introCount) || 0 : null,
    firstPurchases: funnel ? Number(funnel.report2?.firstPurchaseCount) || 0 : null,
    leadToIntroPct: funnel ? Number(funnel.report1?.ratePct) || 0 : null,
    introToPurchasePct: funnel ? Number(funnel.report2?.ratePct) || 0 : null,
    activeStudents: studentHealth ? Number(studentHealth.totals?.active) || 0 : null,
    bookedPct: studentHealth ? Number(studentHealth.totals?.bookedPct) || 0 : null,
    // Weighted, not a mean of percentages — one 8-lesson teacher shouldn't
    // swing the org number as hard as one 40-lesson teacher.
    utilizationPct: lessons ? (capacityPerWeek ? Math.round((actualPerWeek / capacityPerWeek) * 100) : null) : null,
    capacityPerWeek: lessons ? capacityPerWeek : null,
    actualPerWeek: lessons ? Math.round(actualPerWeek * 10) / 10 : null,
  }
}

/**
 * Percent change with the same "no baseline" semantics the backend's pctTrend()
 * uses — growth from zero is undefined, so callers render "New" rather than a
 * fabricated 100%.
 */
export function delta(current, previous) {
  if (current === null || current === undefined || previous === null || previous === undefined) return null
  const cur = Number(current) || 0
  const prev = Number(previous) || 0
  if (!prev) return cur ? { pct: null, dir: 'up', noBaseline: true } : null
  const pct = ((cur - prev) / Math.abs(prev)) * 100
  return { pct, dir: pct >= 0 ? 'up' : 'down', noBaseline: false }
}

/** Percentage-point change, for metrics that are already percentages. */
export function pointDelta(current, previous) {
  if (current === null || current === undefined || previous === null || previous === undefined) return null
  const diff = (Number(current) || 0) - (Number(previous) || 0)
  return { pct: diff, dir: diff >= 0 ? 'up' : 'down', points: true, noBaseline: false }
}

/**
 * Everything the Owner Dashboard page renders, in one hook.
 *
 * Three owner-overview reads (current / prior period / prior year) power the
 * page body plus every comparison badge, and one dashboard-overview read
 * supplies the series that only live there: the 12-month revenue history
 * (`aiAgentRevenue`), lead source economics (`leadsBySourceConversion`) and
 * leads per studio (`perStudioBreakdown`).
 *
 * Each section is independently permission-gated on the backend, so any of
 * these can legitimately come back absent — consumers must treat a missing
 * key as "not visible to this user", not as empty data.
 */
export function useOwnerDashboardPage(range) {
  const { priorPeriod, priorYear } = useMemo(() => comparisonWindows(range), [range])

  const current = useOwnerDashboardOverview(range)
  const previous = useOwnerDashboardOverview(priorPeriod)
  const lastYear = useOwnerDashboardOverview(priorYear)
  const classic = useDashboardOverview(range)

  const summaries = useMemo(
    () => ({
      current: summarize(current.data),
      previous: summarize(previous.data),
      lastYear: summarize(lastYear.data),
    }),
    [current.data, previous.data, lastYear.data]
  )

  return {
    data: current.data,
    classic: classic.data,
    summaries,
    // Raw comparison payloads, for panels that need per-row (per studio, per
    // teacher) growth rather than a single org-wide scalar.
    comparisons: { previous: previous.data, lastYear: lastYear.data },
    error: current.error,
    // Only the primary read blocks first paint. The comparison reads and the
    // classic-overview read fill in their badges/charts as they land, so a slow
    // secondary request never holds the whole page on a skeleton.
    isLoading: current.isLoading && !current.data,
    isValidating: current.isValidating || previous.isValidating || lastYear.isValidating,
    refresh: current.mutate,
  }
}
