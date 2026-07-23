'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { Card, SectionLabel, Trend } from './shared'
import DetailsButton from './DetailsButton'

function yearValue(row, which) {
  if (which === 'this') return row.thisYear ?? row.y2026 ?? 0
  return row.lastYear ?? row.y2025 ?? 0
}

const DETAIL_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'customer', label: 'Customer' },
  { key: 'type', label: 'Type' },
  { key: 'method', label: 'Method' },
  {
    key: 'amount',
    label: 'Amount',
    format: (v) => `$${(Number(v) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
  },
]

export default function RevenueAndAiAgentWidget({
  revenueFromIntros,
  humanInterventionRequired = 0,
  aiAgentRevenue = [],
  defaultRange,
}) {
  const revenue = revenueFromIntros || { value: 0, trendPct: 0, trendType: 'up' }
  const chartData = aiAgentRevenue.map((m) => ({
    month: m.month,
    thisYear: yearValue(m, 'this'),
    lastYear: yearValue(m, 'last'),
  }))
  const yearTotal = chartData.reduce((s, m) => s + (m.thisYear || 0), 0)

  return (
    <Card>
      <div className="flex justify-end">
        <DetailsButton
          title="Revenue Collected from Intros — full details"
          metric="payments"
          rangeDays={defaultRange}
          columns={DETAIL_COLUMNS}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-6">
        <div>
          <SectionLabel>Revenue Collected from Intros</SectionLabel>
          <h3 className="mt-1 text-[28px] font-bold leading-[1.21] tracking-tight tabular-nums text-foreground sm:text-[32px]">
            ${revenue.value.toLocaleString()}
          </h3>
          <Trend
            type={revenue.trendType}
            text={`${(revenue.trendPct ?? 0).toFixed(1)}% from last period`}
          />
          <p className="mt-3 text-sm text-muted-foreground">
            Human intervention open:{' '}
            <span className="font-semibold text-foreground">{humanInterventionRequired}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
            AI Agent Revenue
          </p>
          <h3 className="mt-1 text-[28px] font-bold leading-[1.21] tracking-tight tabular-nums text-foreground sm:text-[32px]">
            ${yearTotal.toLocaleString()}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">Year-over-year comparison</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--studio-primary)' }} />
          This year
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--studio-primary-light)' }} />
          Last year
        </span>
      </div>

      <div className="mt-4 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barCategoryGap={20} barGap={-32} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="aiRevBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--bar-gradient-end)" />
                <stop offset="100%" stopColor="var(--bar-gradient-start)" />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartGridStroke} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fill: chartAxisStroke, fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v === 0 ? '0' : `${v / 1000}k`)}
            />
            <Tooltip
              contentStyle={rechartsTooltipContentStyle}
              formatter={(v) => [`$${Number(v).toLocaleString()}`]}
            />
            <Bar dataKey="lastYear" fill="var(--studio-primary-light)" radius={[8, 8, 0, 0]} name="Last Year" barSize={32} />
            <Bar dataKey="thisYear" fill="url(#aiRevBar)" radius={[8, 8, 0, 0]} name="This Year" barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
