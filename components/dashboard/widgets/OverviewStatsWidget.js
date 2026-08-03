'use client'

import { Card, Trend } from './shared'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'stage', label: 'Stage' },
  { key: 'uploadType', label: 'Source' },
  { key: 'createdAt', label: 'Created', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
]

export default function OverviewStatsWidget({ overviewStats, defaultRange }) {
  const stats = overviewStats || {}
  const totalLeads = stats.totalLeads || { value: 0, trendPct: 0, trendType: 'up' }
  const totalBookings =
    stats.totalBookings || stats.paymentProgress || { value: 0, trendPct: 0, trendType: 'up' }
  const bookingRate =
    stats.bookingRate || stats.paymentRate || { value: 0, trendPct: 0, trendType: 'up' }

  const num = (v) => Number(v) || 0

  // Badge shows the bare percentage; the full sentence stays as its tooltip /
  // accessible name so the number keeps its meaning out of context.
  const pct = (stat) => `${(stat.trendPct ?? 0).toFixed(1)}%`
  const pctLabel = (stat) => `${(stat.trendPct ?? 0).toFixed(1)}% from last period`

  const cards = [
    {
      title: 'Total Leads',
      value: num(totalLeads.value).toLocaleString(),
      trend: pct(totalLeads),
      trendLabel: pctLabel(totalLeads),
      trendType: totalLeads.trendType,
    },
    {
      title: 'Total Bookings',
      value: num(totalBookings.value).toLocaleString(),
      trend: pct(totalBookings),
      trendLabel: pctLabel(totalBookings),
      trendType: totalBookings.trendType,
    },
    {
      title: 'Booking Rate',
      value: `${Math.round(num(bookingRate.value))}%`,
      trend: pct(bookingRate),
      trendLabel: pctLabel(bookingRate),
      trendType: bookingRate.trendType,
    },
  ]

  return (
    <section className="flex h-full flex-col gap-3">
      <div className="flex justify-end">
        <DetailsButton title="Leads — full details" metric="leads" rangeDays={defaultRange} columns={DETAIL_COLUMNS} />
      </div>
      <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <div className="flex items-start justify-between gap-3">
              <p className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
                {card.title}
              </p>
              <Trend
                type={card.trendType}
                text={card.trend}
                label={card.trendLabel}
                className="shrink-0"
              />
            </div>
            <h3 className="mt-1 text-[38px] font-bold leading-[1.21] bg-gradient-to-b from-muted-foreground to-foreground bg-clip-text text-transparent">
              {card.value}
            </h3>
          </Card>
        ))}
      </div>
    </section>
  )
}
