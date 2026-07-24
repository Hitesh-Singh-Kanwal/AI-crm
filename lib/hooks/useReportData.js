'use client'

import useSWR from 'swr'
import { api } from '@/lib/api'
import { buildReportQuery } from '@/lib/reports/reportFilters'

const reportSwrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 30_000,
  keepPreviousData: true,
  errorRetryCount: 2,
}

async function fetchReport(path) {
  const res = await api.get(path)
  if (!res.success) throw new Error(res.error || 'Request failed')
  return res.data ?? {}
}

export function useReportData(reportSlug, filters, { page = 1, pageSize = 50, enabled = true } = {}) {
  const query = buildReportQuery(filters, { page, pageSize })
  const path = `/api/reports/${reportSlug}?${query}`
  const key = enabled ? ['report-data', reportSlug, query] : null

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    () => fetchReport(path),
    reportSwrConfig
  )

  return {
    rows: data?.rows || [],
    summary: data?.summary || {},
    totalCount: data?.totalCount ?? 0,
    page: data?.page ?? page,
    pageSize: data?.pageSize ?? pageSize,
    isLoading,
    isValidating,
    error,
    mutate,
  }
}
