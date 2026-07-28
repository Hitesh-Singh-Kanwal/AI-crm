import { describe, it, expect } from 'vitest'
import { formatReportCellValue } from '../formatReportCell'

describe('formatReportCellValue', () => {
  it('formats ISO timestamps as readable dates', () => {
    expect(formatReportCellValue('2026-09-23T13:39:38.444Z')).toBe('Sep 23, 2026')
  })

  it('formats date-only strings', () => {
    expect(formatReportCellValue('2026-07-01')).toBe('Jul 1, 2026')
  })

  it('returns em dash for empty values', () => {
    expect(formatReportCellValue(null)).toBe('—')
    expect(formatReportCellValue('')).toBe('—')
  })

  it('honors column.format when provided', () => {
    expect(formatReportCellValue(100, { format: (v) => `$${v}` })).toBe('$100')
  })

  it('leaves plain strings alone', () => {
    expect(formatReportCellValue('Amara Obi')).toBe('Amara Obi')
  })
})
