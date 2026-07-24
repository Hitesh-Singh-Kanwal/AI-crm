'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from '@/components/reports/widgets/shared'

export function SalesCashTrendChart({ trend = [] }) {
  if (!trend.length) return null

  return (
    <section className={chartCardClass}>
      <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
        Sales &amp; Cash Trend
      </h3>
      <div className="mt-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salesCashFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--side-gradient-end)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--side-gradient-end)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartGridStroke} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={rechartsTooltipContentStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="saleAmount" name="Sale Amount" stroke="var(--side-gradient-end)" strokeWidth={2} fill="url(#salesCashFill)" />
            <Area type="monotone" dataKey="cashCollected" name="Cash Collected" stroke="var(--bar-gradient-start)" strokeWidth={2} fill="transparent" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
