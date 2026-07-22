'use client'

import { Card, Trend } from '@/components/dashboard/widgets/shared'

export default function StudentHealthOverviewWidget({ studentHealth }) {
  const totals = studentHealth?.totals || { active: 0, booked: 0, notBooked: 0, bookedPct: 0 }
  const momGrowth = studentHealth?.newActiveTrend?.momGrowth || { value: 0, trendPct: 0, trendType: 'up' }
  const ytdGrowth = studentHealth?.newActiveTrend?.ytdGrowth || { value: 0, trendPct: 0, trendType: 'up' }

  const cards = [
    { title: 'Active Students', value: totals.active.toLocaleString() },
    { title: 'Booked', value: `${totals.booked.toLocaleString()} (${totals.bookedPct}%)` },
    {
      title: 'New Active — MTD',
      value: momGrowth.value.toLocaleString(),
      trend: `${(momGrowth.trendPct ?? 0).toFixed(1)}% vs last month`,
      trendType: momGrowth.trendType,
    },
    {
      title: 'New Active — YTD',
      value: ytdGrowth.value.toLocaleString(),
      trend: `${(ytdGrowth.trendPct ?? 0).toFixed(1)}% vs same period last year`,
      trendType: ytdGrowth.trendType,
    },
  ]

  return (
    <section className="grid h-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <p className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
            {card.title}
          </p>
          <h3 className="mt-1 text-[32px] font-bold leading-[1.21] bg-gradient-to-b from-muted-foreground to-foreground bg-clip-text text-transparent">
            {card.value}
          </h3>
          {card.trend && <Trend type={card.trendType} text={card.trend} />}
        </Card>
      ))}
    </section>
  )
}
