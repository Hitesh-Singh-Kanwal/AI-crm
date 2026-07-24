'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from '@/components/reports/widgets/shared'

const STATUS_COLORS = { Active: 'var(--side-gradient-end)', Inactive: 'hsl(var(--muted-foreground))' }

export function StudentStatusChart({ activeCount = 0, inactiveCount = 0 }) {
  const data = [
    { name: 'Active', value: activeCount },
    { name: 'Inactive', value: inactiveCount },
  ]
  const total = activeCount + inactiveCount

  return (
    <section className={chartCardClass}>
      <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
        Active vs Inactive
      </h3>
      <div className="mt-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} stroke="none">
              {data.map((entry) => (
                <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
              ))}
            </Pie>
            <Tooltip contentStyle={rechartsTooltipContentStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[item.name] }} />
            <span>{item.name}: {item.value}{total ? ` (${Math.round((item.value / total) * 100)}%)` : ''}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
