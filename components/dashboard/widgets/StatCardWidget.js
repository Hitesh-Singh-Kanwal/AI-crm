'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from './shared'

const DEFAULT_STAT = { value: 0, trendPct: 0, trendType: 'up' }

/**
 * Renders one stat from overviewStats. `statKey` selects which entry
 * (totalLeads | totalBookings | bookingRate); `format` controls display.
 */
export default function StatCardWidget({ overviewStats, statKey, label, format = 'number' }) {
  const stat = overviewStats?.[statKey] || DEFAULT_STAT
  const isUp = stat.trendType === 'up'
  const value = format === 'percent' ? `${stat.value}%` : stat.value.toLocaleString()

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <p className="text-xs uppercase tracking-wide font-semibold text-[var(--studio-primary)]">{label}</p>
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[46px] font-bold text-foreground">{value}</p>
        <div className={`flex items-center text-sm font-medium ${isUp ? 'text-emerald-600' : 'text-rose-500'}`}>
          {isUp ? <TrendingUp size={14} className="mr-2" /> : <TrendingDown size={14} className="mr-2" />}
          <span className="text-[13px]">{(stat.trendPct ?? 0).toFixed(1)}% vs last period</span>
        </div>
      </div>
    </Card>
  )
}
