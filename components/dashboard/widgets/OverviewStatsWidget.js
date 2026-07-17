'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from './shared'

function StatCard({ label, value, trendPct, trendType }) {
  const isUp = trendType === 'up'
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-wide font-semibold text-[var(--studio-primary)]">{label}</p>
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[46px] font-bold text-foreground">{value}</p>
        <div className={`flex items-center text-sm font-medium ${isUp ? 'text-emerald-600' : 'text-rose-500'}`}>
          {isUp ? <TrendingUp size={14} className="mr-2" /> : <TrendingDown size={14} className="mr-2" />}
          <span className="text-[13px]">{(trendPct ?? 0).toFixed(1)}% vs last period</span>
        </div>
      </div>
    </Card>
  )
}

export default function OverviewStatsWidget({ overviewStats }) {
  const stats = overviewStats || {}
  const totalLeads = stats.totalLeads || { value: 0, trendPct: 0, trendType: 'up' }
  const totalBookings = stats.totalBookings || { value: 0, trendPct: 0, trendType: 'up' }
  const bookingRate = stats.bookingRate || { value: 0, trendPct: 0, trendType: 'up' }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <StatCard label="TOTAL LEADS" value={totalLeads.value.toLocaleString()} trendPct={totalLeads.trendPct} trendType={totalLeads.trendType} />
      <StatCard label="TOTAL BOOKINGS" value={totalBookings.value.toLocaleString()} trendPct={totalBookings.trendPct} trendType={totalBookings.trendType} />
      <StatCard label="BOOKING RATE" value={`${bookingRate.value}%`} trendPct={bookingRate.trendPct} trendType={bookingRate.trendType} />
    </div>
  )
}
