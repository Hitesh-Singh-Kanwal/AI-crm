'use client'

import { Users, CalendarCheck2, UserPlus, TrendingUp } from 'lucide-react'
import { Card, Trend } from '@/components/dashboard/widgets/shared'
import RangeDropdown from './RangeDropdown'

export default function StudentHealthOverviewWidget({ studentHealth, rangeDays, onRangeChange }) {
  const totals = studentHealth?.totals || { active: 0, booked: 0, notBooked: 0, bookedPct: 0 }
  const momGrowth = studentHealth?.newActiveTrend?.momGrowth || { value: 0, trendPct: 0, trendType: 'up' }
  const ytdGrowth = studentHealth?.newActiveTrend?.ytdGrowth || { value: 0, trendPct: 0, trendType: 'up' }

  const cards = [
    { title: 'Active Students', value: totals.active.toLocaleString(), icon: Users },
    { title: 'Booked', value: `${totals.booked.toLocaleString()} (${totals.bookedPct}%)`, icon: CalendarCheck2 },
    {
      title: 'New Active — MTD',
      value: momGrowth.value.toLocaleString(),
      trend: `${(momGrowth.trendPct ?? 0).toFixed(1)}% vs last month`,
      trendType: momGrowth.trendType,
      icon: UserPlus,
    },
    {
      title: 'New Active — YTD',
      value: ytdGrowth.value.toLocaleString(),
      trend: `${(ytdGrowth.trendPct ?? 0).toFixed(1)}% vs same period last year`,
      trendType: ytdGrowth.trendType,
      icon: TrendingUp,
    },
  ]

  return (
    <section className="flex h-full flex-col gap-3">
      {onRangeChange && (
        <div className="flex justify-end">
          <RangeDropdown value={rangeDays} onChange={onRangeChange} />
        </div>
      )}
      <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--studio-primary-light)] text-[var(--studio-primary)]">
                <card.icon className="h-4 w-4" aria-hidden />
              </span>
              <p className="truncate text-[13px] font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
                {card.title}
              </p>
            </div>
            <h3 className="mt-2.5 text-[32px] font-bold leading-[1.21] bg-gradient-to-b from-muted-foreground to-foreground bg-clip-text text-transparent">
              {card.value}
            </h3>
            {card.trend && <Trend type={card.trendType} text={card.trend} />}
          </Card>
        ))}
      </div>
    </section>
  )
}
