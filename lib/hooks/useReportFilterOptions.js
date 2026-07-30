'use client'

import useSWR from 'swr'
import { api } from '@/lib/api'

const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60_000,
}

async function fetchFilterOptions() {
  const res = await api.get('/api/reports/filter-options')
  if (!res.success) throw new Error(res.error || 'Failed to load filter options')
  return {
    studios: Array.isArray(res.data?.studios) ? res.data.studios : [],
    teachers: Array.isArray(res.data?.teachers) ? res.data.teachers : [],
    programs: Array.isArray(res.data?.programs) ? res.data.programs : [],
    leadSources: Array.isArray(res.data?.leadSources) ? res.data.leadSources : [],
    defaultActiveWindowDays: res.data?.defaultActiveWindowDays || 30,
    timezone: res.data?.timezone || 'America/New_York',
  }
}

export function useReportFilterOptions({ enabled = true } = {}) {
  const { data, error, isLoading, mutate } = useSWR(
    enabled ? 'report-filter-options' : null,
    fetchFilterOptions,
    swrConfig
  )

  return {
    studios: data?.studios || [],
    teachers: data?.teachers || [],
    programs: data?.programs || [],
    leadSources: data?.leadSources || [],
    defaultActiveWindowDays: data?.defaultActiveWindowDays || 30,
    timezone: data?.timezone || 'America/New_York',
    isLoading,
    error,
    mutate,
  }
}
