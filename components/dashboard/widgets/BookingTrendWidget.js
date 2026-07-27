'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { Card, WidgetTitleRow, EmptyChart } from './shared'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'stage', label: 'Stage' },
  { key: 'createdAt', label: 'Created', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
]

export default function BookingTrendWidget({ bookingRateTrend = [], defaultRange }) {
  return (
    <Card>
      <WidgetTitleRow
        title="Booking Rate Trend"
        detailsButton={
          <DetailsButton
            title="Booking Rate Trend — full details"
            metric="leads"
            rangeDays={defaultRange}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {bookingRateTrend.length > 0 ? (
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={bookingRateTrend} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="bookingFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--side-gradient-end)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--side-gradient-end)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="week" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fill: chartAxisStroke, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip contentStyle={rechartsTooltipContentStyle} formatter={(v) => [`${v}%`, 'Rate']} />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="var(--side-gradient-end)"
                strokeWidth={2}
                fill="url(#bookingFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart />
      )}
    </Card>
  )
}
