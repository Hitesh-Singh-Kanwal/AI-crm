'use client'

import { chartCardClass, Trend } from './shared'
import ReportsDetailsButton, { LEAD_DETAIL_COLUMNS, paymentDetailColumns } from './ReportsDetailsButton'

function formatMoney(n) {
  const num = Number(n) || 0
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 10000) return `$${(num / 1000).toFixed(1)}k`
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

const PAYMENT_COLUMNS = paymentDetailColumns(formatMoney)

const KPI_DETAILS = {
  'Total Revenue': {
    title: 'Total Revenue — full details',
    metric: 'payments',
    columns: PAYMENT_COLUMNS,
  },
  'New Leads': {
    title: 'New Leads — full details',
    metric: 'leads',
    columns: LEAD_DETAIL_COLUMNS,
  },
  'Conversion Rate': {
    title: 'Converted Leads — full details',
    metric: 'leads',
    params: { stageGroup: 'converted' },
    columns: LEAD_DETAIL_COLUMNS,
  },
  'Avg Deal Size': {
    title: 'Payments — full details',
    metric: 'payments',
    columns: PAYMENT_COLUMNS,
  },
}

export default function KpiCardsWidget({ kpiCards = [], defaultRange = 30 }) {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
      {kpiCards.map((card) => {
        const detail = KPI_DETAILS[card.title]
        return (
          <div key={card.title} className={chartCardClass}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
                {card.title}
              </p>
              {detail ? (
                <ReportsDetailsButton
                  title={detail.title}
                  metric={detail.metric}
                  rangeDays={defaultRange}
                  params={detail.params}
                  columns={detail.columns}
                  compact
                />
              ) : null}
            </div>
            <h3 className="mt-1 text-[38px] font-bold leading-[1.21] bg-gradient-to-b from-muted-foreground to-foreground bg-clip-text text-transparent">
              {card.value}
            </h3>
            <Trend type={card.trendType} text={card.trend} />
          </div>
        )
      })}
    </section>
  )
}
