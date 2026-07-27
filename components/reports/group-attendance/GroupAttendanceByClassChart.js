'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from '@/components/reports/widgets/shared'

export function GroupAttendanceByClassChart({ byClass = [] }) {
  if (!byClass.length) return null

  return (
    <section className={chartCardClass}>
      <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
        Attendance by Class
      </h3>
      <div className="mt-4 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byClass} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} vertical={false} />
            <XAxis dataKey="className" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={rechartsTooltipContentStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="attended" name="Attended" stackId="a" radius={[0, 0, 0, 0]} fill="var(--side-gradient-end)" />
            <Bar dataKey="absent" name="Absent" stackId="a" radius={[8, 8, 0, 0]} fill="hsl(var(--muted-foreground))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
