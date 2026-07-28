import { describe, it, expect } from 'vitest'
import { buildReportPdfHtml } from '../exportPdf'
import { buildReportQuery, parseReportFiltersFromSearchParams } from '../reportFilters'

describe('exportPdf', () => {
  it('builds printable HTML with columns and rows', () => {
    const html = buildReportPdfHtml(
      [{ studentName: 'Ada', saleAmount: 100 }],
      [
        { key: 'studentName', label: 'Student' },
        { key: 'saleAmount', label: 'Sale' },
      ],
      'Sales Report'
    )
    expect(html).toContain('Sales Report')
    expect(html).toContain('<th>Student</th>')
    expect(html).toContain('Ada')
    expect(html).toContain('100')
  })
})

describe('reportFilters extended keys', () => {
  it('serializes comparison and activeWindowDays', () => {
    const qs = buildReportQuery(
      { comparison: 'mom', activeWindowDays: '45' },
      { page: 1, pageSize: 50 }
    )
    expect(qs).toContain('comparison=mom')
    expect(qs).toContain('activeWindowDays=45')
  })

  it('parses new filter keys', () => {
    const params = new URLSearchParams('comparison=yoy&activeWindowDays=60&status=Active')
    expect(parseReportFiltersFromSearchParams(params)).toMatchObject({
      comparison: 'yoy',
      activeWindowDays: '60',
      status: 'Active',
    })
  })
})
