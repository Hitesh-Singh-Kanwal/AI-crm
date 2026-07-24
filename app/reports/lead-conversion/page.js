'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { ReportPicker } from '@/components/reports/ReportPicker'
import { ReportFilterBar } from '@/components/reports/ReportFilterBar'
import { ReportDrillPanel } from '@/components/reports/ReportDrillPanel'
import { LeadConversionTable, LEAD_CONVERSION_COLUMNS } from '@/components/reports/lead-conversion/LeadConversionTable'
import { LeadSourceChart } from '@/components/reports/lead-conversion/LeadSourceChart'
import { useReportData } from '@/lib/hooks/useReportData'
import { parseReportFiltersFromSearchParams, buildReportQuery } from '@/lib/reports/reportFilters'
import { exportCurrentPageToCsv } from '@/lib/reports/exportCsv'
import { Button } from '@/components/ui/button'

export default function LeadConversionReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filters = parseReportFiltersFromSearchParams(searchParams)
  const [page, setPage] = useState(1)
  const [drillId, setDrillId] = useState(null)

  const { rows, summary, totalCount, pageSize, isLoading, isValidating, error, mutate } = useReportData(
    'lead-conversion',
    filters,
    { page }
  )

  function handleFiltersChange(nextFilters) {
    setPage(1)
    router.push(`/reports/lead-conversion?${buildReportQuery(nextFilters, { page: 1, pageSize: 50 })}`)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <MainLayout title="Lead Conversion Report" subtitle="Lead-to-sale funnel by source and teacher">
      <ReportPicker activeSlug="lead-conversion" />

      <div className="mt-4 flex items-center justify-between gap-3">
        <ReportFilterBar filters={filters} onChange={handleFiltersChange} studios={[]} teachers={[]} programs={[]} leadSources={[]} showLeadSource={true} />
        <Button variant="outline" size="sm" onClick={() => exportCurrentPageToCsv(rows, LEAD_CONVERSION_COLUMNS, 'lead-conversion.csv')}>
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
        <span>Conversion Rate: {summary.conversionRatePct ?? 0}%</span>
        {isValidating && !isLoading && <span>Updating…</span>}
      </div>

      {!isLoading && !error && <div className="mt-4"><LeadSourceChart bySource={summary.bySource} /></div>}

      <div className="mt-2">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <LeadConversionTable rows={rows} onRowClick={(row) => setDrillId(row.id)} />
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
        reportSlug="lead-conversion"
        recordId={drillId}
        title="Lead Detail"
        renderDetail={(detail) => (
          <div className="space-y-2 p-4 text-sm">
            <p><strong>Lead:</strong> {detail.leadName}</p>
            <p><strong>Source:</strong> {detail.leadSource}</p>
            <p><strong>Sale Amount:</strong> {detail.saleAmount}</p>
          </div>
        )}
      />
    </MainLayout>
  )
}
