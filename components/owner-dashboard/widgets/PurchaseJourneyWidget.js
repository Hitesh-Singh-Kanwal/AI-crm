'use client'

import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import { FunnelStage, FunnelConnector } from './shared'
import WidgetHeader from './WidgetHeader'

function formatMoney(n) {
  const num = Number(n) || 0
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 10000) return `$${(num / 1000).toFixed(1)}k`
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export default function PurchaseJourneyWidget({ funnel, rangeDays, onRangeChange }) {
  const stages = funnel?.report3?.purchaseJourney || []

  return (
    <Card>
      <WidgetHeader title="Purchase Journey" rangeDays={rangeDays} onRangeChange={onRangeChange} />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Report 3 — how far customers get through repeat purchases, and what each one is worth.
      </p>
      {stages.length > 0 ? (
        <div className="mt-4 flex items-stretch justify-center gap-1 overflow-x-auto pb-1">
          {stages.map((s, i) => (
            <div key={s.label} className="flex items-stretch gap-1">
              {i > 0 && (
                <FunnelConnector
                  ratePct={stages[i - 1].count ? Math.round((s.count / stages[i - 1].count) * 100) : 0}
                  caption={s.avgDaysSincePrevious !== null ? `avg ${s.avgDaysSincePrevious}d later` : undefined}
                />
              )}
              <FunnelStage
                label={s.label}
                value={s.count.toLocaleString()}
                metrics={[
                  { label: 'Avg sale', value: formatMoney(s.avgSaleValue) },
                  { label: 'Avg LTV', value: formatMoney(s.avgLtv) },
                ]}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyChart message="No purchases in this period." />
      )}
    </Card>
  )
}
