'use client'

import { useReportData } from '@/lib/hooks/useReportData'
import { OutstandingBalanceByStudioChart } from '@/components/reports/outstanding-balance/OutstandingBalanceByStudioChart'
import { chartCardClass } from './shared'
import ReportsDetailsButton, { OUTSTANDING_DETAIL_COLUMNS } from './ReportsDetailsButton'

export default function OutstandingBalanceWidget({ defaultRange = 30 }) {
  const { summary, isLoading } = useReportData('outstanding-balance', {}, { pageSize: 1 })

  return (
    <section className={chartCardClass}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
          Outstanding Balance
        </h3>
        <ReportsDetailsButton
          title="Outstanding Balance — full details"
          metric="outstandingBalances"
          source="owner"
          rangeDays={defaultRange}
          columns={OUTSTANDING_DETAIL_COLUMNS}
        />
      </div>
      <p className="text-xs text-muted-foreground">Total Outstanding: {summary.totalOutstandingBalance ?? 0}</p>
      <div className="mt-4">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <OutstandingBalanceByStudioChart byStudio={summary.byStudio} />
        )}
      </div>
    </section>
  )
}
