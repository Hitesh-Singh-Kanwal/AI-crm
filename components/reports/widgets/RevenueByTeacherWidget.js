'use client'

import { useReportData } from '@/lib/hooks/useReportData'
import { RevenueByEntityChart } from '@/components/reports/revenue-by-teacher/RevenueByEntityChart'
import { chartCardClass, DetailsLink } from './shared'

export default function RevenueByTeacherWidget() {
  const { rows, summary, isLoading } = useReportData('revenue-by-teacher', { groupBy: 'teacher' }, { pageSize: 50 })

  return (
    <section className={chartCardClass}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
          Revenue by Teacher
        </h3>
        <DetailsLink href="/reports/revenue-by-teacher" />
      </div>
      <p className="text-xs text-muted-foreground">Total Revenue: {summary.totalRevenue ?? 0}</p>
      <div className="mt-4">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <RevenueByEntityChart rows={rows} />
        )}
      </div>
    </section>
  )
}
