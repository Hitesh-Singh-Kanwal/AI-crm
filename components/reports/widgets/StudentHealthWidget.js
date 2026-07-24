'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from './shared'

const STATUS_COLORS = { Active: 'var(--side-gradient-end)', Inactive: 'hsl(var(--muted-foreground))' }

export default function StudentHealthWidget({ studentHealthData = [], onSliceClick }) {
  const data = studentHealthData.length ? studentHealthData : [{ name: 'Active', value: 0 }, { name: 'Inactive', value: 0 }]
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0)

  return (
    <section className={chartCardClass}>
      <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
        Student Health
      </h3>
      <div className="mt-4 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              stroke="none"
              onClick={(entry) => onSliceClick?.(entry.name)}
              className={onSliceClick ? 'cursor-pointer' : undefined}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || 'hsl(var(--muted))'} />
              ))}
            </Pie>
            <Tooltip contentStyle={rechartsTooltipContentStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {data.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onSliceClick?.(item.name)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[item.name] || 'hsl(var(--muted))' }} />
            <span>{item.name}: {item.value}{total ? ` (${Math.round((item.value / total) * 100)}%)` : ''}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
