'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BAR_GRADIENT_DEFS, BAR_FILL, BAR_FILL_SOFT } from '@/components/charts/barGradients'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle, rechartsTooltipCursor, rechartsTooltipItemStyle } from '@/lib/chartStyles'
import { Card, WidgetTitleRow, EmptyChart } from './shared'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleString() : '—') },
  { key: 'channel', label: 'Channel' },
  { key: 'lead', label: 'Lead' },
  { key: 'status', label: 'Status' },
]

export default function WeeklyActivityWidget({ weeklyActivity = [], defaultRange }) {
  const hasData = weeklyActivity.some((d) => d.calls > 0 || d.emails > 0 || d.sms > 0)

  return (
    <Card>
      <WidgetTitleRow
        title="Weekly Activity"
        detailsButton={
          <DetailsButton
            title="Weekly Activity — full details"
            metric="activity"
            rangeDays={defaultRange}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {hasData ? (
        <>
          <div className="mt-4 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivity} barCategoryGap={24} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                {BAR_GRADIENT_DEFS}
                <CartesianGrid stroke={chartGridStroke} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={rechartsTooltipContentStyle}
                  cursor={rechartsTooltipCursor}
                  itemStyle={rechartsTooltipItemStyle}
                />
                <Bar dataKey="calls" fill={BAR_FILL} radius={[8, 8, 4, 4]} />
                <Bar dataKey="emails" fill={BAR_FILL_SOFT} radius={[8, 8, 4, 4]} />
                <Bar dataKey="sms" fill="var(--chart-5)" radius={[8, 8, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--bar-gradient-start)]" />
              Calls
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--bar-soft-start)]" />
              Email
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[var(--chart-5)]" />
              SMS
            </span>
          </div>
        </>
      ) : (
        <EmptyChart message="No activity this period." />
      )}
    </Card>
  )
}
