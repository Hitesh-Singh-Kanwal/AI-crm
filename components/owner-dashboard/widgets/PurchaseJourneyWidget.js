'use client'

import { useState } from 'react'
import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import { FunnelStage, FunnelConnector } from './shared'
import WidgetHeader from './WidgetHeader'
import DetailsButton from './DetailsButton'
import FunnelDrilldownTable from './FunnelDrilldownTable'

const DETAIL_COLUMNS = [
  { key: 'name', label: 'Customer' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'studio', label: 'Studio' },
  { key: 'purchaseCount', label: 'Purchases' },
  { key: 'totalLtv', label: 'Total LTV', format: (v) => `$${Number(v || 0).toLocaleString()}` },
  { key: 'lastPurchase', label: 'Last Purchase', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
]

function formatMoney(n) {
  const num = Number(n) || 0
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 10000) return `$${(num / 1000).toFixed(1)}k`
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export default function PurchaseJourneyWidget({ funnel, rangeDays, onRangeChange }) {
  const [activeStage, setActiveStage] = useState(null)

  const stages = funnel?.report3?.purchaseJourney || []
  const topCount = stages[0]?.count || 1

  const toggle = (i) => setActiveStage((cur) => (cur === i ? null : i))

  return (
    <Card>
      <WidgetHeader
        title="Purchase Journey"
        rangeDays={rangeDays}
        onRangeChange={onRangeChange}
        detailsButton={
          <DetailsButton
            title="Purchase Journey — full details"
            metric="purchaseJourney"
            rangeDays={rangeDays}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Report 3 — how far customers get through repeat purchases, and what each one is worth. Click a card for the
        underlying customers.
      </p>
      {stages.length > 0 ? (
        <>
          <div className="mt-4 flex items-stretch gap-2 overflow-x-auto pb-1">
            {stages.map((s, i) => (
              <div key={s.label} className="flex flex-1 items-stretch gap-2">
                {i > 0 && (
                  <FunnelConnector
                    ratePct={stages[i - 1].count ? Math.round((s.count / stages[i - 1].count) * 100) : 0}
                    caption={s.avgDaysSincePrevious !== null ? `avg ${s.avgDaysSincePrevious}d later` : undefined}
                  />
                )}
                <FunnelStage
                  label={s.label}
                  value={s.count.toLocaleString()}
                  barPct={Math.round((s.count / topCount) * 100)}
                  highlight={activeStage === null && i === 0}
                  onClick={() => toggle(i)}
                  active={activeStage === i}
                  metrics={[
                    { label: 'Avg sale', value: formatMoney(s.avgSaleValue) },
                    { label: 'Avg LTV', value: formatMoney(s.avgLtv) },
                  ]}
                />
              </div>
            ))}
          </div>

          {activeStage !== null && stages[activeStage] && (
            <FunnelDrilldownTable
              title={`${stages[activeStage].label} — customers with ${activeStage + 1}+ purchases`}
              metric="purchaseJourney"
              rangeDays={rangeDays}
              columns={DETAIL_COLUMNS}
              filterFn={(r) => (Number(r.purchaseCount) || 0) >= activeStage + 1}
              onClose={() => setActiveStage(null)}
            />
          )}
        </>
      ) : (
        <EmptyChart message="No purchases in this period." />
      )}
    </Card>
  )
}
