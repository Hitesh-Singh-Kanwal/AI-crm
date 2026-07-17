'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { Card, SectionLabel, PRIMARY, GRADIENT_COLOR } from './shared'

export default function BookingTrendAndFollowUpWidget({ bookingRateTrend = [], followUpEffectiveness = [] }) {
  const maxSent = Math.max(...followUpEffectiveness.map((r) => r.sent), 1)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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

      <Card className="p-5 rounded-[20px] border-2 border-border shadow-sm">
        <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
          Follow-up Effectiveness
        </p>

        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_2fr] gap-6 pb-2">
              {['Contacts', 'Sent', 'Reply', 'Rate', 'Sent Visual'].map((h) => (
                <div key={h} className="text-[12px] font-semibold text-muted-foreground">{h}</div>
              ))}
            </div>
            <div className="h-px bg-border" />

            <div className="divide-y divide-border">
              {followUpEffectiveness.map((row) => (
                <div key={row.contacts} className="grid grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_2fr] gap-6 py-3 text-[13px] text-foreground">
                  <div>{row.contacts}</div>
                  <div>{row.sent}</div>
                  <div>{row.reply}</div>
                  <div>{row.rate}</div>
                  <div className="flex items-center gap-3">
                    <div className="h-3 flex-1 rounded-full bg-muted">
                      <div
                        className="h-3 rounded-full"
                        style={{
                          width: `${Math.round((row.sent / maxSent) * 100)}%`,
                          background: `linear-gradient(90deg, var(--side-gradient-start) 0%, var(--side-gradient-end) 100%)`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_2fr] gap-6 py-3 text-[13px] font-semibold text-foreground">
                <div>Total</div>
                <div>{followUpEffectiveness.reduce((a, r) => a + r.sent, 0)}</div>
                <div>{followUpEffectiveness.reduce((a, r) => a + r.reply, 0)}</div>
                <div>—</div>
                <div />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
