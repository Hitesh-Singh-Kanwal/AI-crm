'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from '@/components/reports/widgets/shared'

export function RevenueByEntityChart({ rows = [] }) {
  const data = rows.slice(0, 10).map((r) => ({ entityName: r.entityName, revenueGenerated: r.revenueGenerated }))
  if (!data.length) return null

  return (
    <section className={chartCardClass}>
      <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
        Revenue by Entity
      </h3>
      <div className="mt-4 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} vertical={false} />
            <XAxis dataKey="entityName" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={rechartsTooltipContentStyle} />
            <Bar dataKey="revenueGenerated" name="Revenue" radius={[8, 8, 0, 0]} fill="url(#revenueBarGradient)" />
            <defs>
              <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--bar-gradient-start)" />
                <stop offset="100%" stopColor="var(--bar-gradient-end)" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
