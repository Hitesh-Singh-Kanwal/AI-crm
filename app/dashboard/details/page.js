'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { useDashboardDetailsRequest } from '@/lib/dashboardDetailsStore'
import { useDashboardOverviewDetails, useOwnerOverviewDetails } from '@/lib/hooks/useAnalyticsOverview'
import { buildLeadQueryParams } from '@/lib/lead-filter-fields'
import api from '@/lib/api'

const PAGE_SIZE = 25

function formatCell(row, column) {
  const value = row[column.key]
  if (column.format) return column.format(value, row)
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function dateOnly(d) {
  return d.toISOString().slice(0, 10)
}

function rangeDates(days) {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from: dateOnly(from), to: dateOnly(to) }
}

/**
 * Generic full-page replacement for the old widget "Details" modal. The
 * triggering widget stashes its request (title/metric/columns/etc, including
 * non-serializable `format` functions) in lib/dashboardDetailsStore before
 * navigating here, since this is a client-side route change within the same
 * app shell rather than a reload.
 */
export default function DashboardDetailsPage() {
  const request = useDashboardDetailsRequest()
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [request])

  const isDashboard = request?.source === 'dashboard'
  const isOwner = request?.source === 'owner'
  const isLeads = request?.source === 'leads'

  const dashboardResult = useDashboardOverviewDetails({
    metric: request?.metric,
    range: request?.rangeDays,
    page,
    limit: PAGE_SIZE,
    params: request?.params,
    enabled: isDashboard,
  })
  const ownerResult = useOwnerOverviewDetails({
    metric: request?.metric,
    range: request?.rangeDays,
    page,
    limit: PAGE_SIZE,
    params: request?.params,
    enabled: isOwner,
  })

  const [leadsData, setLeadsData] = useState(null)
  const [leadsLoading, setLeadsLoading] = useState(false)

  useEffect(() => {
    if (!isLeads) return
    let cancelled = false
    setLeadsLoading(true)
    const { from, to } = rangeDates(request.rangeDays)
    const params = buildLeadQueryParams({
      page,
      limit: PAGE_SIZE,
      filters: {
        conditions: [
          { field: 'createdFrom', operator: 'eq', value: from },
          { field: 'createdTo', operator: 'eq', value: to },
        ],
        conditionLogic: 'AND',
      },
    })

    api.get(`/api/lead?${params.toString()}`).then((res) => {
      if (cancelled) return
      const pagination = res.pagination ?? res.data?.pagination
      setLeadsData({ rows: res.success ? res.data || [] : [], total: res.success ? pagination?.total ?? 0 : 0 })
      setLeadsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [isLeads, page, request?.rangeDays])

  if (!request) {
    return (
      <MainLayout title="Details" subtitle="Full details">
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-foreground">No details to show</p>
          <p className="mt-1 text-sm text-muted-foreground">Open this page from a widget&apos;s Details button.</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </MainLayout>
    )
  }

  const { rows, total, isLoading } = isDashboard
    ? { rows: dashboardResult.data?.rows || [], total: dashboardResult.data?.total || 0, isLoading: dashboardResult.isLoading }
    : isOwner
      ? { rows: ownerResult.data?.rows || [], total: ownerResult.data?.total || 0, isLoading: ownerResult.isLoading }
      : { rows: leadsData?.rows || [], total: leadsData?.total || 0, isLoading: leadsLoading }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1)

  return (
    <MainLayout title={request.title} subtitle="Full details">
      <Link
        href={request.backHref || '/dashboard'}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {isLoading && rows.length === 0 ? (
          <div className="h-40 animate-pulse bg-muted/30" />
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No records for this selection.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {request.columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className="whitespace-nowrap bg-muted/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={row._id || row.id || i} className="even:bg-muted/20">
                  {request.columns.map((col) => (
                    <TableCell key={col.key} className="whitespace-nowrap text-sm">
                      {formatCell(row, col)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages} · {total.toLocaleString()} total
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border p-1.5 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="rounded-lg border border-border p-1.5 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </MainLayout>
  )
}
