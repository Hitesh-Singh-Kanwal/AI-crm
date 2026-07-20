'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { Card, SectionLabel, EmptyChart } from './shared'

function formatMoney(n) {
  const num = Number(n) || 0
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 10000) return `$${(num / 1000).toFixed(1)}k`
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export default function GrossNetRevenueWidget({ grossRevenue = 0, netRevenue = 0, apiExpenseTotal = 0 }) {
  const expense = apiExpenseTotal || Math.max(0, Number(grossRevenue) - Number(netRevenue))
  const chartData = [
    { name: 'Gross', value: Math.max(0, Number(grossRevenue) || 0), fill: '#F72585' },
    { name: 'API Cost', value: Math.max(0, Number(expense) || 0), fill: '#FB9BC7' },
    { name: 'Net', value: Number(netRevenue) || 0, fill: '#45B7DA' },
  ]
  const hasData = chartData.some((d) => d.value !== 0)

  return (
    <Card>
      <SectionLabel>Gross & Net Revenue</SectionLabel>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[12px] font-medium text-muted-foreground">Gross</p>
          <p className="mt-1 text-[22px] font-bold leading-tight tracking-tight tabular-nums text-foreground sm:text-[26px]">
            {formatMoney(grossRevenue)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Intro bookings</p>
        </div>
        <div>
          <p className="text-[12px] font-medium text-muted-foreground">Net</p>
          <p className="mt-1 text-[22px] font-bold leading-tight tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400 sm:text-[26px]">
            {formatMoney(netRevenue)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">After API costs</p>
        </div>
      </div>
      {hasData ? (
        <div className="mt-4 h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={28}>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                tick={{ fill: chartAxisStroke, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip
                contentStyle={rechartsTooltipContentStyle}
                formatter={(v) => [`$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`]}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={36}>
                {chartData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyChart />
      )}
    </Card>
  )
}
