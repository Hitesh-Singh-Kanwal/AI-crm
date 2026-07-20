'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { Card, SectionLabel, EmptyChart } from './shared'

export default function ResponseRateByTimeWidget({ responseRateByTime = [] }) {
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
      <SectionLabel>Response Rate by Time</SectionLabel>
      {hasData ? (
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={24}>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={rechartsTooltipContentStyle} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="sent" name="Sent" fill="var(--side-gradient-start)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="reply" name="Reply" fill="#4CC9F0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart />
      )}
    </Card>
  )
}
