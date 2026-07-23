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
  const totalBookings = stats.totalBookings || { value: 0, trendPct: 0, trendType: 'up' }
  const bookingRate = stats.bookingRate || { value: 0, trendPct: 0, trendType: 'up' }

  const cards = [
    {
      title: 'Total Leads',
      value: totalLeads.value.toLocaleString(),
      trend: `${(totalLeads.trendPct ?? 0).toFixed(1)}% from last period`,
      trendType: totalLeads.trendType,
    },
    {
      title: 'Total Bookings',
      value: totalBookings.value.toLocaleString(),
      trend: `${(totalBookings.trendPct ?? 0).toFixed(1)}% from last period`,
      trendType: totalBookings.trendType,
    },
    {
      title: 'Booking Rate',
      value: `${bookingRate.value}%`,
      trend: `${(bookingRate.trendPct ?? 0).toFixed(1)}% from last period`,
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
            <p className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
              {card.title}
            </p>
            <h3 className="mt-1 text-[38px] font-bold leading-[1.21] bg-gradient-to-b from-muted-foreground to-foreground bg-clip-text text-transparent">
              {card.value}
            </h3>
            <Trend type={card.trendType} text={card.trend} />
          </Card>
        ))}
      </div>
    </section>
  )
}
