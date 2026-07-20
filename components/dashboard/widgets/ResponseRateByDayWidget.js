'use client'

import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { Card, SectionLabel, EmptyChart } from './shared'

export default function ResponseRateByDayWidget({ responseRateByDay = [] }) {
  const data = responseRateByDay.map((r) => ({
    label: r.dayShort || r.day?.slice(0, 3) || r.day,
    sent: r.sent,
    reply: r.reply,
    ratePct: r.ratePct ?? (parseInt(r.rate, 10) || 0),
  }))
  const hasData = data.some((r) => r.sent > 0 || r.reply > 0)

  return (
    <Card>
      <SectionLabel>Response Rate by Day</SectionLabel>
      {hasData ? (
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={20}>
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
                formatter={(v, name) => [name === 'ratePct' ? `${v}%` : v, name === 'ratePct' ? 'Rate' : name]}
              />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar yAxisId="left" dataKey="sent" name="Sent" fill="var(--side-gradient-start)" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="left" dataKey="reply" name="Reply" fill="var(--side-gradient-end)" radius={[4, 4, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ratePct"
                name="Rate %"
                stroke="#F72585"
                strokeWidth={2}
                dot={{ r: 3, fill: '#F72585' }}
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
