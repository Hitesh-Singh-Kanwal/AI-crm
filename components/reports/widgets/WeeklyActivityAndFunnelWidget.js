'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BAR_GRADIENT_DEFS, BAR_FILL, BAR_FILL_SOFT } from '@/components/charts/barGradients'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from './shared'
import ReportsDetailsButton, { ACTIVITY_DETAIL_COLUMNS, LEAD_DETAIL_COLUMNS } from './ReportsDetailsButton'

export default function WeeklyActivityAndFunnelWidget({
  weeklyActivityData = [],
  conversionFunnelData = [],
  defaultRange = 30,
}) {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className={chartCardClass}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">Weekly Activity</h3>
          <ReportsDetailsButton
            title="Weekly Activity — full details"
            metric="activity"
            rangeDays={defaultRange}
            columns={ACTIVITY_DETAIL_COLUMNS}
          />
        </div>
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyActivityData} barCategoryGap={24} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              {BAR_GRADIENT_DEFS}
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="day" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={rechartsTooltipContentStyle} />
              <Bar dataKey="calls" fill={BAR_FILL} radius={[8, 8, 4, 4]} />
              <Bar dataKey="emails" fill={BAR_FILL_SOFT} radius={[8, 8, 4, 4]} />
              <Bar dataKey="sms" fill="var(--chart-5)" radius={[8, 8, 4, 4]} />
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
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">Conversion Funnel</h3>
          <ReportsDetailsButton
            title="Conversion Funnel — full details"
            metric="leads"
            rangeDays={defaultRange}
            columns={LEAD_DETAIL_COLUMNS}
          />
        </div>
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
