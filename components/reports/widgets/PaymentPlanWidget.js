'use client'

import { useReportData } from '@/lib/hooks/useReportData'
import { PaymentPlanDueChart } from '@/components/reports/payment-plan/PaymentPlanDueChart'
import { chartCardClass, DetailsLink } from './shared'

export default function PaymentPlanWidget() {
  const { summary, isLoading } = useReportData('payment-plan', {}, { pageSize: 1 })

  return (
    <section className={chartCardClass}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
          Payment Plan Due
        </h3>
        <DetailsLink href="/reports/payment-plan" />
      </div>
      <p className="text-xs text-muted-foreground">Plans with Upcoming Due Dates: {summary.upcomingDueCount ?? 0}</p>
      <div className="mt-4">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <PaymentPlanDueChart dueByMonth={summary.dueByMonth} />
        )}
      </div>
    </section>
  )
}
