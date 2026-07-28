'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from '@/components/reports/widgets/shared'

export function LeadSourceChart({ bySource = [] }) {
  if (!bySource.length) return null

  return (
    <section className={chartCardClass}>
      <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
        Leads &amp; Conversions by Source
      </h3>
      <div className="mt-4 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={bySource} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} vertical={false} />
            <XAxis dataKey="source" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={rechartsTooltipContentStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="leads" name="Leads" radius={[8, 8, 0, 0]} fill="var(--bar-gradient-start)" />
            <Bar dataKey="converted" name="Converted" radius={[8, 8, 0, 0]} fill="var(--side-gradient-end)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
