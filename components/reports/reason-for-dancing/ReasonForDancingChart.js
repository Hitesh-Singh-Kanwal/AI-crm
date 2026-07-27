'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from '@/components/reports/widgets/shared'

const PALETTE = ['#FDBBD9', '#FB9BC7', '#FA6DAD', '#F72585', '#E12279', '#B31B63', '#7A1246']

export function ReasonForDancingChart({ byReason = [] }) {
  if (!byReason.length) return null
  const data = byReason.map((r, i) => ({ ...r, color: PALETTE[i % PALETTE.length] }))

  return (
    <section className={chartCardClass}>
      <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
        Reasons for Dancing
      </h3>
      <div className="mt-4 h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="count" nameKey="reason" cx="50%" cy="50%" innerRadius={0} outerRadius={90} stroke="none">
              {data.map((entry) => (
                <Cell key={entry.reason} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={rechartsTooltipContentStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {data.map((item) => (
          <div key={item.reason} className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
            <span>{item.reason}: {item.count}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
