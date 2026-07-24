'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { ReportPicker } from '@/components/reports/ReportPicker'
import { ReportFilterBar } from '@/components/reports/ReportFilterBar'
import { ReportDrillPanel } from '@/components/reports/ReportDrillPanel'
import { ActiveInactiveStudentsTable, ACTIVE_INACTIVE_STUDENTS_COLUMNS } from '@/components/reports/active-inactive-students/ActiveInactiveStudentsTable'
import { useReportData } from '@/lib/hooks/useReportData'
import { parseReportFiltersFromSearchParams, buildReportQuery } from '@/lib/reports/reportFilters'
import { exportCurrentPageToCsv } from '@/lib/reports/exportCsv'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ActiveInactiveStudentsReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filters = parseReportFiltersFromSearchParams(searchParams)
  const activeWindowDays = Number(searchParams.get('activeWindowDays') || 30)
  const [page, setPage] = useState(1)
  const [drillId, setDrillId] = useState(null)

  const { rows, summary, totalCount, pageSize, isLoading, isValidating, error, mutate } = useReportData(
    'active-inactive-students',
    { ...filters, activeWindowDays },
    { page }
  )

  function pushWithParams(nextFilters, nextActiveWindowDays) {
    setPage(1)
    const query = buildReportQuery(nextFilters, { page: 1, pageSize: 50 })
    router.push(`/reports/active-inactive-students?${query}&activeWindowDays=${nextActiveWindowDays}`)
  }

  function handleFiltersChange(nextFilters) {
    pushWithParams(nextFilters, activeWindowDays)
  }

  function handleActiveWindowDaysChange(e) {
    pushWithParams(filters, Number(e.target.value) || 30)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <MainLayout title="Active and Inactive Student Report" subtitle="Student activity status based on recent and upcoming lessons">
      <ReportPicker activeSlug="active-inactive-students" />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <ReportFilterBar filters={filters} onChange={handleFiltersChange} studios={[]} teachers={[]} programs={[]} leadSources={[]} showLeadSource={false} />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground" htmlFor="activeWindowDays">Active Window (days)</label>
            <Input
              id="activeWindowDays"
              type="number"
              min={1}
              className="h-9 w-28"
              value={activeWindowDays}
              onChange={handleActiveWindowDaysChange}
            />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => exportCurrentPageToCsv(rows, ACTIVE_INACTIVE_STUDENTS_COLUMNS, 'active-inactive-students.csv')}>
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
        <span>Active: {summary.activeCount ?? 0} · Inactive: {summary.inactiveCount ?? 0}</span>
        {isValidating && !isLoading && <span>Updating…</span>}
      </div>

      <div className="mt-2">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ActiveInactiveStudentsTable rows={rows} onRowClick={(row) => setDrillId(row.id)} />
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
        reportSlug="active-inactive-students"
        recordId={drillId}
        title="Student Detail"
        renderDetail={(detail) => (
          <div className="space-y-2 p-4 text-sm">
            <p><strong>Student:</strong> {detail.studentName}</p>
            <p><strong>Status:</strong> {detail.status}</p>
            <p><strong>Last Lesson:</strong> {detail.lastLessonDate}</p>
          </div>
        )}
      />
    </MainLayout>
  )
}
