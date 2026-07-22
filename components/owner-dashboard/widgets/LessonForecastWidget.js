'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { Card, SectionLabel, EmptyChart } from '@/components/dashboard/widgets/shared'

export default function LessonForecastWidget({ lessons }) {
  const data = lessons?.forecastByStudio || []

  return (
    <Card>
      <SectionLabel>Scheduled Lessons Forecast</SectionLabel>
      {data.length > 0 ? (
        <div className="mt-4 h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="location" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={rechartsTooltipContentStyle} formatter={(v) => [v, 'Scheduled']} />
              <Bar dataKey="scheduled" name="Scheduled" radius={[8, 8, 0, 0]} fill="#4CC9F0" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart message="No upcoming lessons scheduled." />
      )}
    </Card>
  )
}
