'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { ReportPicker } from '@/components/reports/ReportPicker'
import { ReportFilterBar } from '@/components/reports/ReportFilterBar'
import { ReportDrillPanel } from '@/components/reports/ReportDrillPanel'
import { RevenueByTeacherTable, REVENUE_BY_TEACHER_COLUMNS } from '@/components/reports/revenue-by-teacher/RevenueByTeacherTable'
import { useReportData } from '@/lib/hooks/useReportData'
import { parseReportFiltersFromSearchParams, buildReportQuery } from '@/lib/reports/reportFilters'
import { exportCurrentPageToCsv } from '@/lib/reports/exportCsv'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

export default function RevenueByTeacherReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filters = parseReportFiltersFromSearchParams(searchParams)
  const groupBy = filters.groupBy || 'teacher'
  const [page, setPage] = useState(1)
  const [drillId, setDrillId] = useState(null)

  const { rows, summary, totalCount, pageSize, isLoading, isValidating, error, mutate } = useReportData(
    'revenue-by-teacher',
    { ...filters, groupBy },
    { page }
  )

  function handleFiltersChange(nextFilters) {
    setPage(1)
    router.push(`/reports/revenue-by-teacher?${buildReportQuery({ ...nextFilters, groupBy }, { page: 1, pageSize: 50 })}`)
  }

  function handleGroupByChange(nextGroupBy) {
    setPage(1)
    router.push(`/reports/revenue-by-teacher?${buildReportQuery({ ...filters, groupBy: nextGroupBy }, { page: 1, pageSize: 50 })}`)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <MainLayout title="Revenue by Teacher" subtitle="Revenue and performance grouped by teacher, studio, or program">
      <ReportPicker activeSlug="revenue-by-teacher" />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <ReportFilterBar filters={filters} onChange={handleFiltersChange} studios={[]} teachers={[]} programs={[]} leadSources={[]} showLeadSource={false} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="groupBy">Group By</label>
            <Select
              id="groupBy"
              aria-label="Group By"
              className="h-9 w-36"
              value={groupBy}
              onChange={(e) => handleGroupByChange(e.target.value)}
            >
              <option value="teacher">Teacher</option>
              <option value="studio">Studio</option>
              <option value="program">Program</option>
            </Select>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCurrentPageToCsv(rows, REVENUE_BY_TEACHER_COLUMNS, `revenue-by-${filters.groupBy || 'teacher'}.csv`)}>
          Export CSV
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-foreground">Couldn't load report. <span className="text-muted-foreground">{error.message}</span></p>
          <Button variant="outline" size="sm" className="h-8" onClick={() => mutate()}>Retry</Button>
        </div>
      )}

      <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
        <span>Total Revenue: {summary.totalRevenue ?? 0}</span>
        {isValidating && !isLoading && <span>Updating…</span>}
      </div>

      <div className="mt-2">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <RevenueByTeacherTable rows={rows} onRowClick={(row) => setDrillId(row.id)} />
        )}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
      </div>

      <ReportDrillPanel
        open={Boolean(drillId)}
        onClose={() => setDrillId(null)}
        reportSlug="revenue-by-teacher"
        recordId={drillId}
        title="Performance Detail"
        renderDetail={(detail) => (
          <div className="space-y-2 p-4 text-sm">
            <p><strong>Name:</strong> {detail.entityName}</p>
            <p><strong>Revenue Generated:</strong> {detail.revenueGenerated}</p>
            <p><strong>Retention %:</strong> {detail.retentionPct}</p>
          </div>
        )}
      />
    </MainLayout>
  )
}
