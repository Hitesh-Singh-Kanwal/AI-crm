'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from './shared'

export default function GroupAttendanceWidget({ groupAttendanceData = { attendanceRatePct: 0, byClass: [] }, onClassClick }) {
  const { attendanceRatePct, byClass } = groupAttendanceData

  return (
    <section className={chartCardClass}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
          Group Attendance
        </h3>
        <span className="text-sm text-muted-foreground">Attendance Rate: {attendanceRatePct}%</span>
      </div>
      <p className="text-xs text-muted-foreground">Click a class to see its attendance roster</p>
      <div className="mt-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={byClass} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartGridStroke} vertical={false} />
            <XAxis dataKey="className" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={rechartsTooltipContentStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="attended"
              name="Attended"
              stackId="a"
              fill="var(--side-gradient-end)"
              onClick={(entry) => onClassClick?.(entry?.className)}
              className={onClassClick ? 'cursor-pointer' : undefined}
            />
            <Bar
              dataKey="absent"
              name="Absent"
              stackId="a"
              radius={[8, 8, 0, 0]}
              fill="hsl(var(--muted-foreground))"
              onClick={(entry) => onClassClick?.(entry?.className)}
              className={onClassClick ? 'cursor-pointer' : undefined}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
