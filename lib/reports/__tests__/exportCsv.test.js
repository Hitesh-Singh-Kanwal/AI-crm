import { describe, it, expect } from 'vitest'
import { exportCurrentPageToCsv } from '../exportCsv'

describe('exportCurrentPageToCsv', () => {
  it('builds a CSV string with header row from column labels', () => {
    const csv = exportCurrentPageToCsv(
      [{ studentName: 'Jane Doe', saleAmount: 100 }],
      [{ key: 'studentName', label: 'Student Name' }, { key: 'saleAmount', label: 'Sale Amount' }],
      'sales-cash.csv'
    )
    expect(csv).toBe('Student Name,Sale Amount\nJane Doe,100')
  })

  it('quotes values containing commas', () => {
    const csv = exportCurrentPageToCsv(
      [{ studentName: 'Doe, Jane', saleAmount: 100 }],
      [{ key: 'studentName', label: 'Student Name' }, { key: 'saleAmount', label: 'Sale Amount' }],
      'sales-cash.csv'
    )
    expect(csv).toBe('Student Name,Sale Amount\n"Doe, Jane",100')
  })

  it('returns empty header-only string for zero rows', () => {
    const csv = exportCurrentPageToCsv(
      [],
      [{ key: 'studentName', label: 'Student Name' }],
      'sales-cash.csv'
    )
    expect(csv).toBe('Student Name')
  })
})
