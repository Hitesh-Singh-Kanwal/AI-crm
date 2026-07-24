import { describe, it, expect } from 'vitest'
import { buildReportQuery, parseReportFiltersFromSearchParams } from '../reportFilters'

describe('buildReportQuery', () => {
  it('serializes provided filters with page and pageSize', () => {
    const qs = buildReportQuery(
      { dateFrom: '2026-01-01', dateTo: '2026-01-31', studioId: 'abc' },
      { page: 2, pageSize: 50 }
    )
    expect(qs).toBe('dateFrom=2026-01-01&dateTo=2026-01-31&studioId=abc&page=2&pageSize=50')
  })

  it('omits empty, null, and undefined filter values', () => {
    const qs = buildReportQuery(
      { dateFrom: '2026-01-01', teacherId: '', programId: null, leadSource: undefined },
      { page: 1, pageSize: 50 }
    )
    expect(qs).toBe('dateFrom=2026-01-01&page=1&pageSize=50')
  })
})

describe('parseReportFiltersFromSearchParams', () => {
  it('extracts known filter keys, defaulting missing ones to empty string', () => {
    const params = new URLSearchParams('dateFrom=2026-01-01&studioId=abc')
    expect(parseReportFiltersFromSearchParams(params)).toEqual({
      dateFrom: '2026-01-01',
      dateTo: '',
      studioId: 'abc',
      teacherId: '',
      programId: '',
      leadSource: '',
      groupBy: '',
    })
  })
})
