'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { Card } from './shared'

export default function AiAgentRevenueWidget({ aiAgentRevenue = [] }) {
  const yearTotal = aiAgentRevenue.reduce((s, m) => s + (m.y2026 || 0), 0)

  return (
    <Card className="p-5 rounded-[20px] border-2 border-border shadow-sm">
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
            AI Agent Revenue
          </p>
          <p className="text-[14px] font-medium text-muted-foreground">Year-over-year Comparison</p>
        </div>
        <p className="text-[38px] font-bold bg-gradient-to-b from-muted-foreground to-foreground bg-clip-text text-transparent">
          ${yearTotal.toLocaleString()}
        </p>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <span className="flex items-center gap-2 text-[14px] text-muted-foreground">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--studio-primary)' }} />
          This Year
        </span>
        <span className="flex items-center gap-2 text-[14px] text-muted-foreground">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--studio-primary-light)' }} />
          Last Year
        </span>
      </div>

      <div className="mt-1">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={aiAgentRevenue} barCategoryGap={20} barGap={-32} margin={{ top: 16, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="aiAgentBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--bar-gradient-end)" />
                <stop offset="100%" stopColor="var(--bar-gradient-start)" />
              </linearGradient>
            </defs>

            <CartesianGrid stroke={chartGridStroke} vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: chartAxisStroke }} axisLine={false} tickLine={false} />
            <YAxis
              width={40}
              tick={{ fontSize: 12, fill: chartAxisStroke }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v === 0 ? '0' : `${v / 1000}k`)}
            />
            <Tooltip
              contentStyle={{ ...rechartsTooltipContentStyle, borderRadius: 10 }}
              formatter={(v) => [`$${Number(v).toLocaleString()}`]}
            />
            <Bar dataKey="y2025" fill="var(--studio-primary-light)" radius={[8, 8, 0, 0]} name="Last Year" barSize={32} />
            <Bar dataKey="y2026" fill="url(#aiAgentBarGradient)" radius={[8, 8, 0, 0]} name="This Year" barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
