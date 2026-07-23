'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import WidgetHeader from './WidgetHeader'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'studio', label: 'Studio' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'title', label: 'Lesson' },
  { key: 'status', label: 'Status' },
]

export default function LessonTrendWidget({ lessons, rangeDays, onRangeChange }) {
  const data = lessons?.trend || []

  return (
    <Card>
      <WidgetHeader
        title="Lessons Trend"
        rangeDays={rangeDays}
        onRangeChange={onRangeChange}
        detailsButton={
          <DetailsButton
            title="Lessons Trend — full details"
            metric="lessonTrend"
            rangeDays={rangeDays}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {data.length > 0 ? (
        <div className="mt-4 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ownerLessonTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--studio-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--studio-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="week" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={rechartsTooltipContentStyle} formatter={(v) => [v, 'Lessons']} />
              <Area
                type="monotone"
                dataKey="count"
                name="Lessons"
                stroke="var(--studio-primary)"
                strokeWidth={2}
                fill="url(#ownerLessonTrendGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart message="No completed lessons in this period." />
      )}
    </Card>
  )
}
