'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { BAR_GRADIENT_DEFS, BAR_FILL, BAR_FILL_SOFT } from '@/components/charts/barGradients'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle, rechartsTooltipCursor, rechartsTooltipItemStyle } from '@/lib/chartStyles'
import { Card, WidgetTitleRow, EmptyChart } from './shared'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleString() : '—') },
  { key: 'lead', label: 'Lead' },
  { key: 'status', label: 'Status' },
]

export default function ResponseRateByTimeWidget({ responseRateByTime = [], defaultRange }) {
  const data = responseRateByTime
    .filter((r) => r.time !== 'All Day')
    .map((r) => ({
      label: r.time,
      sent: r.sent,
      reply: r.reply,
    }))
  const hasData = data.some((r) => r.sent > 0 || r.reply > 0)

  return (
    <Card>
      <WidgetTitleRow
        title="Response Rate by Time"
        detailsButton={
          <DetailsButton
            title="Response Rate by Time — full details"
            metric="activity"
            rangeDays={defaultRange}
            params={{ channel: 'sms' }}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {hasData ? (
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={24}>
              {BAR_GRADIENT_DEFS}
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={rechartsTooltipContentStyle}
                cursor={rechartsTooltipCursor}
                itemStyle={rechartsTooltipItemStyle}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="sent" name="Sent" fill={BAR_FILL_SOFT} radius={[8, 8, 4, 4]} />
              <Bar dataKey="reply" name="Reply" fill={BAR_FILL} radius={[8, 8, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart />
      )}
    </Card>
  )
}
