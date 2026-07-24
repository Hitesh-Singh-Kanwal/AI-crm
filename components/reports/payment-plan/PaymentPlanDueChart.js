'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from '@/components/reports/widgets/shared'

export function PaymentPlanDueChart({ dueByMonth = [] }) {
  if (!dueByMonth.length) return null

  return (
    <section className={chartCardClass}>
      <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
        Installments Due by Month
      </h3>
      <div className="mt-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dueByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} vertical={false} />
            <XAxis dataKey="month" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={rechartsTooltipContentStyle} />
            <Bar dataKey="count" name="Installments Due" radius={[8, 8, 0, 0]} fill="url(#dueBarGradient)" />
            <defs>
              <linearGradient id="dueBarGradient" x1="0" y1="0" x2="0" y2="1">
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
