import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useReportFilterOptions } from '../useReportFilterOptions'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

import { api } from '@/lib/api'

describe('useReportFilterOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads studios, teachers, and packages (as programs)', async () => {
    api.get.mockResolvedValue({
      success: true,
      data: {
        studios: [{ id: 's1', label: 'Main' }],
        teachers: [{ id: 't1', label: 'Ada' }],
        programs: [{ id: 'p1', label: 'Intro 4' }],
        leadSources: [{ id: 'Manual', label: 'Manual' }],
        defaultActiveWindowDays: 30,
      },
    })

    const { result } = renderHook(() => useReportFilterOptions())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(api.get).toHaveBeenCalledWith('/api/reports/filter-options')
    expect(result.current.studios).toEqual([{ id: 's1', label: 'Main' }])
    expect(result.current.programs[0].label).toBe('Intro 4')
  })
})
