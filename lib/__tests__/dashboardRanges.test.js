import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { rangeQuery } from '../hooks/useAnalyticsOverview'
import { comparisonWindows } from '../hooks/useOwnerDashboardPage'

const q = (s) => Object.fromEntries(new URLSearchParams(s))

describe('rangeQuery: calendar ideas are sent as calendar ideas', () => {
  it('sends "Today" as a period for the backend to place on the studio day, never as browser-midnight timestamps', () => {
    expect(q(rangeQuery(0))).toEqual({ period: 'today' })
  })

  it('sends a picked date range as plain dates, not UTC-midnight timestamps', () => {
    expect(q(rangeQuery({ from: '2026-10-05', to: '2026-10-06' }))).toEqual({
      fromDate: '2026-10-05',
      toDate: '2026-10-06',
    })
  })

  it('sends today-comparison windows with their offsets', () => {
    expect(q(rangeQuery({ period: 'today', offsetDays: 1 }))).toEqual({ period: 'today', offsetDays: '1' })
    expect(q(rangeQuery({ period: 'today', offsetYears: 1 }))).toEqual({ period: 'today', offsetYears: '1' })
  })

  it('keeps rolling "last N days" and exact timestamp windows as exact instants', () => {
    const rolling = q(rangeQuery(30))
    expect(new Date(rolling.to) - new Date(rolling.from)).toBe(30 * 24 * 3600 * 1000)

    const exact = q(rangeQuery({ from: '2026-09-06T08:11:18.924Z', to: '2026-10-06T08:11:18.924Z' }))
    expect(exact).toEqual({ from: '2026-09-06T08:11:18.924Z', to: '2026-10-06T08:11:18.924Z' })
  })
})

describe('comparisonWindows', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-06T10:02:41.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('compares today with the same hours yesterday and a year ago, whatever the browser clock says', () => {
    expect(comparisonWindows(0)).toEqual({
      priorPeriod: { period: 'today', offsetDays: 1 },
      priorYear: { period: 'today', offsetYears: 1 },
    })
  })

  it('compares a picked date range with the equally long run of days before it, and a year earlier', () => {
    const w = comparisonWindows({ from: '2026-10-05', to: '2026-10-07' }) // 3 days
    expect(w.priorPeriod).toEqual({ from: '2026-10-02', to: '2026-10-04' })
    expect(w.priorYear).toEqual({ from: '2025-10-05', to: '2025-10-07' })
  })

  it('compares a single picked day with the day before', () => {
    expect(comparisonWindows({ from: '2026-03-01', to: '2026-03-01' }).priorPeriod).toEqual({
      from: '2026-02-28',
      to: '2026-02-28',
    })
  })

  it('keeps exact, equal-length, gap-free windows for rolling ranges', () => {
    const w = comparisonWindows(30)
    const len = (r) => new Date(r.to) - new Date(r.from)
    expect(len(w.priorPeriod)).toBe(30 * 24 * 3600 * 1000)
    // The prior period ends the instant before the current window starts.
    expect(new Date('2026-10-06T10:02:41.000Z') - new Date(w.priorPeriod.to)).toBe(30 * 24 * 3600 * 1000 + 1)
  })
})
