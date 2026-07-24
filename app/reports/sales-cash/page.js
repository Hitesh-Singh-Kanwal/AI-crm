'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { ReportPicker } from '@/components/reports/ReportPicker'
import { ReportFilterBar } from '@/components/reports/ReportFilterBar'
import { ReportDrillPanel } from '@/components/reports/ReportDrillPanel'
import { SalesCashTable, SALES_CASH_COLUMNS } from '@/components/reports/sales-cash/SalesCashTable'
import { SalesCashTrendChart } from '@/components/reports/sales-cash/SalesCashTrendChart'
import { useReportData } from '@/lib/hooks/useReportData'
import { parseReportFiltersFromSearchParams, buildReportQuery } from '@/lib/reports/reportFilters'
import { exportCurrentPageToCsv } from '@/lib/reports/exportCsv'
import { Button } from '@/components/ui/button'

export default function SalesCashReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const filters = parseReportFiltersFromSearchParams(searchParams)
  const [page, setPage] = useState(1)
  const [drillId, setDrillId] = useState(null)

  const { rows, summary, totalCount, pageSize, isLoading, isValidating, error, mutate } = useReportData(
    'sales-cash',
    filters,
    { page }
  )

  function handleFiltersChange(nextFilters) {
    setPage(1)
    router.push(`/reports/sales-cash?${buildReportQuery(nextFilters, { page: 1, pageSize: 50 })}`)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <MainLayout title="Sales and Cash Report" subtitle="New sales, payments, tips, and refunds">
      <ReportPicker activeSlug="sales-cash" />

      <div className="mt-4 flex items-center justify-between gap-3">
        <ReportFilterBar filters={filters} onChange={handleFiltersChange} studios={[]} teachers={[]} programs={[]} leadSources={[]} showLeadSource={false} />
        <Button variant="outline" size="sm" onClick={() => exportCurrentPageToCsv(rows, SALES_CASH_COLUMNS, 'sales-cash.csv')}>
          Export CSV
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-foreground">Couldn&apos;t load report. <span className="text-muted-foreground">{error.message}</span></p>
          <Button variant="outline" size="sm" className="h-8" onClick={() => mutate()}>Retry</Button>
        </div>
      )}

      <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
        <span>Total Sales: {summary.totalSaleAmount ?? 0}</span>
        <span>Total Cash Collected: {summary.totalCashCollected ?? 0}</span>
        {isValidating && !isLoading && <span>Updating…</span>}
      </div>

      {!isLoading && !error && <div className="mt-4"><SalesCashTrendChart trend={summary.trend} /></div>}

      <div className="mt-2">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <SalesCashTable rows={rows} onRowClick={(row) => setDrillId(row.id)} />
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
        reportSlug="sales-cash"
        recordId={drillId}
        title="Transaction Detail"
        renderDetail={(detail) => (
          <div className="space-y-2 p-4 text-sm">
            <p><strong>Student:</strong> {detail.studentName}</p>
            <p><strong>Teacher:</strong> {detail.teacherName}</p>
            <p><strong>Sale Amount:</strong> {detail.saleAmount}</p>
            <p><strong>Cash Collected:</strong> {detail.cashCollected}</p>
          </div>
        )}
      />
    </MainLayout>
  )
}
