'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from './shared'

export default function WeeklyActivityAndFunnelWidget({ weeklyActivityData = [], conversionFunnelData = [] }) {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className={chartCardClass}>
        <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">Weekly Activity</h3>
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyActivityData} barCategoryGap={24} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={rechartsTooltipContentStyle} />
              <Bar dataKey="calls" fill="var(--side-gradient-start)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="emails" fill="#4CC9F0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sms" fill="var(--side-gradient-end)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--side-gradient-start)]" />Calls</span>
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#4CC9F0]" />Email</span>
          <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--side-gradient-end)]" />SMS</span>
        </div>
      </div>

      <div className={chartCardClass}>
        <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">Conversion Funnel</h3>
        <div className="mt-4 space-y-3">
          {conversionFunnelData.map((stage) => (
            <div key={stage.stage} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{stage.stage}</span>
                <span className="text-muted-foreground">{stage.count} ({stage.percentage}%)</span>
              </div>
              <div className="h-5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${stage.percentage}%`, background: 'var(--side-gradient-css)' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
