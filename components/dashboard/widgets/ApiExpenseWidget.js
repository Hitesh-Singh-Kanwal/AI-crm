'use client'

import { cn } from '@/lib/utils'
import { Card, SectionLabel, CHART_COLORS, EmptyChart } from './shared'
import DonutChart from './DonutChart'

export default function ApiExpenseWidget({ apiExpenseByChannel = [] }) {
  const rows = apiExpenseByChannel.filter((r) => !r.isTotal)
  const totalRow = apiExpenseByChannel.find((r) => r.isTotal)
  const pieData = rows
    .filter((r) => (r.costValue || 0) > 0)
    .map((r, i) => ({
      name: r.channel.replace(/\s*\(.*\)/, ''),
      value: r.costValue,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))

  return (
    <Card>
      <SectionLabel>API Expense by Channel</SectionLabel>
      {pieData.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <DonutChart
            data={pieData}
            centerLabel="Total"
            centerValue={totalRow?.totalCost || '—'}
            valueFormatter={(v) => `$${Number(v).toFixed(2)}`}
            showLegend={false}
            height={210}
          />

          <div className="overflow-x-auto">
            <div className="min-w-[360px] divide-y divide-border">
              <div className="grid grid-cols-[1.6fr_0.7fr_0.8fr_0.6fr] gap-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Channel</span>
                <span>Uses</span>
                <span>Cost</span>
                <span>%</span>
              </div>
              {apiExpenseByChannel.map((row, i) => (
                <div
                  key={i}
                  className={cn(
                    'grid grid-cols-[1.6fr_0.7fr_0.8fr_0.6fr] gap-3 py-2.5 text-sm',
                    row.isTotal ? 'font-semibold text-foreground' : 'text-foreground'
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    {!row.isTotal && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    )}
                    <span className="truncate">{row.channel}</span>
                  </div>
                  <div className="tabular-nums text-muted-foreground">
                    {row.totalUses?.toLocaleString?.() ?? row.totalUses}
                  </div>
                  <div className="tabular-nums">{row.totalCost}</div>
                  <div className="tabular-nums text-muted-foreground">{row.pctTotal}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <EmptyChart message="No API usage this period." />
      )}
    </Card>
  )
}
