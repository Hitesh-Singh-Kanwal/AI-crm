'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from './shared'

export default function RevenueTrendWidget({ revenueTrendData = [] }) {
  return (
    <section className={chartCardClass}>
      <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
        Revenue Trend
      </h3>
      <div className="mt-4 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={revenueTrendData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="reportRevenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--side-gradient-end)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--side-gradient-end)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartGridStroke} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={rechartsTooltipContentStyle} />
            <Area type="monotone" dataKey="revenue" stroke="var(--side-gradient-end)" strokeWidth={2} fill="url(#reportRevenueFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
