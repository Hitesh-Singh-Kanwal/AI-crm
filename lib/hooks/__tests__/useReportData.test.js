import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useReportData } from '../useReportData'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

import { api } from '@/lib/api'

describe('useReportData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches the report endpoint with serialized filters and returns rows/summary', async () => {
    api.get.mockResolvedValue({
      success: true,
      data: { rows: [{ id: '1' }], totalCount: 1, page: 1, pageSize: 50, summary: { totalSaleAmount: 100 } },
    })

    const { result } = renderHook(() =>
      useReportData('sales-cash', { dateFrom: '2026-01-01' })
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(api.get).toHaveBeenCalledWith('/api/reports/sales-cash?dateFrom=2026-01-01&page=1&pageSize=50')
    expect(result.current.rows).toEqual([{ id: '1' }])
    expect(result.current.summary).toEqual({ totalSaleAmount: 100 })
    expect(result.current.totalCount).toBe(1)
  })

  it('exposes an error when the request fails', async () => {
    api.get.mockResolvedValue({ success: false, error: 'Server error' })

    const { result } = renderHook(() => useReportData('sales-cash', {}))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error.message).toBe('Server error')
  })
})
