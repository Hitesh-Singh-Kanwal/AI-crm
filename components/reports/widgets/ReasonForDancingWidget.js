'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from './shared'

const PALETTE = ['#FDBBD9', '#FB9BC7', '#FA6DAD', '#F72585', '#E12279', '#B31B63', '#7A1246']

export default function ReasonForDancingWidget({ reasonForDancingData = [], onReasonClick }) {
  const data = reasonForDancingData.length ? reasonForDancingData : [{ reason: 'No data yet', count: 0 }]
  const chartData = data.map((r, i) => ({ ...r, color: PALETTE[i % PALETTE.length] }))

  return (
    <section className={chartCardClass}>
      <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
        Reasons for Dancing
      </h3>
      <p className="text-xs text-muted-foreground">Click a reason to see who said it</p>
      <div className="mt-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="reason"
              cx="50%"
              cy="50%"
              outerRadius={85}
              stroke="none"
              onClick={(entry) => onReasonClick?.(entry.reason)}
              className={onReasonClick ? 'cursor-pointer' : undefined}
            >
              {chartData.map((entry) => (
                <Cell key={entry.reason} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={rechartsTooltipContentStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {chartData.map((item) => (
          <button
            key={item.reason}
            type="button"
            onClick={() => onReasonClick?.(item.reason)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
            <span>{item.reason}: {item.count}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
