'use client'

import { Card, SectionLabel } from './shared'

export default function RevenueFromIntrosWidget({ revenueFromIntros }) {
  const revenue = revenueFromIntros || { value: 0, trendPct: 0, trendType: 'up' }
  return (
    <Card className="p-5">
      <SectionLabel>Revenue Collected from Intros</SectionLabel>
      <p className="text-[46px] font-bold mt-1 text-foreground">${revenue.value.toLocaleString()}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        <span className={revenue.trendType === 'up' ? 'text-emerald-600 font-medium' : 'text-rose-500 font-medium'}>
          {revenue.trendType === 'up' ? '↑' : '↓'} {(revenue.trendPct ?? 0).toFixed(1)}% vs last period
        </span>
      </p>
    </Card>
  )
}
