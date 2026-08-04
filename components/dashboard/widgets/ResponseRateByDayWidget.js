'use client'

import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts'
import { BAR_GRADIENT_DEFS, BAR_FILL, BAR_FILL_SOFT } from '@/components/charts/barGradients'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle, rechartsTooltipCursor, rechartsTooltipItemStyle } from '@/lib/chartStyles'
import { Card, WidgetTitleRow, EmptyChart } from './shared'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleString() : '—') },
  { key: 'lead', label: 'Lead' },
  { key: 'status', label: 'Status' },
]

export default function ResponseRateByDayWidget({ responseRateByDay = [], defaultRange }) {
  const data = responseRateByDay.map((r) => ({
    label: r.dayShort || r.day?.slice(0, 3) || r.day,
    sent: r.sent,
    reply: r.reply,
    ratePct: r.ratePct ?? (parseInt(r.rate, 10) || 0),
  }))
  const hasData = data.some((r) => r.sent > 0 || r.reply > 0)

  return (
    <Card>
      <WidgetTitleRow
        title="Response Rate by Day"
        detailsButton={
          <DetailsButton
            title="Response Rate by Day — full details"
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
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={20}>
              {BAR_GRADIENT_DEFS}
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fill: chartAxisStroke, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={rechartsTooltipContentStyle}
                cursor={rechartsTooltipCursor}
                itemStyle={rechartsTooltipItemStyle}
                formatter={(v, name) => [name === 'ratePct' ? `${v}%` : v, name === 'ratePct' ? 'Rate' : name]}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar yAxisId="left" dataKey="sent" name="Sent" fill={BAR_FILL_SOFT} radius={[8, 8, 4, 4]} />
              <Bar yAxisId="left" dataKey="reply" name="Reply" fill={BAR_FILL} radius={[8, 8, 4, 4]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ratePct"
                name="Rate %"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'var(--chart-1)' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart />
      )}
    </Card>
  )
}
