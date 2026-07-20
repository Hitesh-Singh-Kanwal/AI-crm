'use client'

import { Card, Trend } from './shared'

export default function OverviewStatsWidget({ overviewStats }) {
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
    <section className="grid h-full grid-cols-1 gap-6 md:grid-cols-3">
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
    </section>
  )
}
