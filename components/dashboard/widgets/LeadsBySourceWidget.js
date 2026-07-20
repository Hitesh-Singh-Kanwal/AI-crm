'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { Card, SectionLabel, EmptyChart } from './shared'

export default function LeadsBySourceWidget({ leadsBySourceConversion = [] }) {
  const data = leadsBySourceConversion.map((r) => ({
    name: r.leadSource,
    value: r.totalLeads,
  }))

  return (
    <Card>
      <SectionLabel>Lead Sources</SectionLabel>
      {data.length > 0 ? (
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dashLeadBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--bar-gradient-start)" />
                  <stop offset="100%" stopColor="var(--bar-gradient-end)" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={rechartsTooltipContentStyle} />
              <Bar dataKey="value" name="Leads" radius={[8, 8, 0, 0]} fill="url(#dashLeadBarGradient)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart message="No leads in this period." />
      )}
    </Card>
  )
}
