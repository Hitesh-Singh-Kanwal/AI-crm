'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { Card, SectionLabel, PRIMARY, GRADIENT_COLOR } from './shared'

export default function BookingRateTrendWidget({ bookingRateTrend = [] }) {
  return (
    <Card className="p-5">
      <SectionLabel>Booking Rate Trend (Last 8 Weeks)</SectionLabel>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={bookingRateTrend} margin={{ top: 4, right: 10, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GRADIENT_COLOR} stopOpacity={0.18} />
              <stop offset="100%" stopColor={GRADIENT_COLOR} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 10, fill: chartAxisStroke }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: chartAxisStroke }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
          />
          <Tooltip contentStyle={{ ...rechartsTooltipContentStyle, borderRadius: 10 }} formatter={(v) => [`${v}%`, 'Booking Rate']} />
          <Area
            type="monotone"
            dataKey="rate"
            stroke={PRIMARY}
            strokeWidth={2.5}
            fill="url(#bookingGradient)"
            dot={false}
            activeDot={{ r: 4, fill: PRIMARY }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  )
}
