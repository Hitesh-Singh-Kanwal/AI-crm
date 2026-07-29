import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useReportPreferences } from '../useReportPreferences'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), put: vi.fn() },
}))

import { api } from '@/lib/api'

describe('useReportPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads favorites and toggles via PUT', async () => {
    api.get.mockResolvedValue({
      success: true,
      data: { favorites: ['sales-cash'], savedViews: [] },
    })
    api.put.mockResolvedValue({
      success: true,
      data: { favorites: ['sales-cash', 'growth'], savedViews: [] },
    })

    const { result } = renderHook(() => useReportPreferences())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.favorites).toEqual(['sales-cash'])

    await act(async () => {
      await result.current.toggleFavorite('growth')
    })

    expect(api.put).toHaveBeenCalledWith('/api/reports/preferences', {
      favorites: ['sales-cash', 'growth'],
    })
    expect(result.current.favorites).toEqual(['sales-cash', 'growth'])
  })
})
