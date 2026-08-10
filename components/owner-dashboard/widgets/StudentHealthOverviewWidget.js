'use client'

import { Users, CalendarCheck2, UserPlus, TrendingUp } from 'lucide-react'
import { Card, Trend } from '@/components/dashboard/widgets/shared'
import RangeDropdown from './RangeDropdown'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'studio', label: 'Studio' },
  { key: 'booked', label: 'Booked' },
]

// `noBaseline` (see pctTrend in ownerDashboard.controller.js) means the prior
// period had 0 — percent growth from zero is undefined, so a fixed "100%"
// badge used to show for both a 0->1 and a 0->11 jump. Show "New" instead of
// a fabricated percentage, and skip the badge entirely when there's nothing
// to report either way (0 now, nothing to compare against).
function trendDisplay(growth, comparisonLabel) {
  if (growth.noBaseline) {
    if (!growth.value) return null
    return { text: 'New', label: `No ${comparisonLabel} data to compare against` }
  }
  const pct = (growth.trendPct ?? 0).toFixed(1)
  return { text: `${pct}%`, label: `${pct}% vs ${comparisonLabel}` }
}

export default function StudentHealthOverviewWidget({ studentHealth, rangeDays, onRangeChange }) {
  const totals = studentHealth?.totals || { active: 0, booked: 0, notBooked: 0, bookedPct: 0 }
  const momGrowth = studentHealth?.newActiveTrend?.momGrowth || { value: 0, trendPct: 0, trendType: 'up' }
  const ytdGrowth = studentHealth?.newActiveTrend?.ytdGrowth || { value: 0, trendPct: 0, trendType: 'up' }
  const momTrend = trendDisplay(momGrowth, 'last month')
  const ytdTrend = trendDisplay(ytdGrowth, 'same period last year')

  const cards = [
    { title: 'Active Students', value: totals.active.toLocaleString(), icon: Users },
    { title: 'Booked', value: `${totals.booked.toLocaleString()} (${totals.bookedPct}%)`, icon: CalendarCheck2 },
    {
      title: 'New Active — MTD',
      value: momGrowth.value.toLocaleString(),
      trend: momTrend?.text,
      trendLabel: momTrend?.label,
      trendType: momGrowth.trendType,
      icon: UserPlus,
    },
    {
      title: 'New Active — YTD',
      value: ytdGrowth.value.toLocaleString(),
      trend: ytdTrend?.text,
      trendLabel: ytdTrend?.label,
      trendType: ytdGrowth.trendType,
      icon: TrendingUp,
    },
  ]

  return (
    <section className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-end gap-2">
        <DetailsButton
          title="Active Students — full details"
          metric="studentHealth"
          rangeDays={rangeDays}
          columns={DETAIL_COLUMNS}
        />
        {onRangeChange && <RangeDropdown value={rangeDays} onChange={onRangeChange} />}
      </div>
      <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--studio-primary-light)] text-[var(--studio-primary)]">
                  <card.icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="truncate text-[13px] font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
                  {card.title}
                </p>
              </div>
              {card.trend && (
                <Trend
                  type={card.trendType}
                  text={card.trend}
                  label={card.trendLabel}
                  className="shrink-0"
                />
              )}
            </div>
            <h3 className="mt-2.5 text-[32px] font-bold leading-[1.21] bg-gradient-to-b from-muted-foreground to-foreground bg-clip-text text-transparent">
              {card.value}
            </h3>
          </Card>
        ))}
      </div>
    </section>
  )
}
