'use client'

import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { chartGridStroke, chartAxisStroke, rechartsTooltipContentStyle } from '@/lib/chartStyles'
import { chartCardClass } from './shared'
import ReportsDetailsButton, { LEAD_DETAIL_COLUMNS } from './ReportsDetailsButton'

const PIPELINE_DETAIL_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'stage', label: 'Stage' },
  { key: 'studio', label: 'Studio' },
  { key: 'createdAt', label: 'Created', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
]

const FALLBACK_COLORS = ['#C81D77', '#E12279', '#F72585', '#FA6DAD', '#FB9BC7', '#0EA5E9', '#45B7DA', '#67E8F9']

const PIPELINE_LABEL_POS = [
  'absolute left-[48px] top-[20px] text-[14px] leading-[20px] text-muted-foreground',
  'absolute left-[38px] top-[88px] text-[14px] leading-[20px] text-muted-foreground',
  'absolute left-[66px] top-[146px] text-[14px] leading-[20px] text-muted-foreground',
  'absolute right-[32px] top-[118px] text-[14px] leading-[20px] text-muted-foreground',
  'absolute right-[70px] top-[20px] text-[14px] leading-[20px] text-muted-foreground',
]

/**
 * The backend already sends `color` and `percentage` (largest-remainder, sums
 * to 100). Only fill gaps for a payload that predates that — never recompute.
 */
function withPipelinePresentation(rows = []) {
  const total = rows.reduce((n, r) => n + (Number(r.value) || 0), 0)
  return rows.map((r, i) => ({
    ...r,
    color: r.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    percentage:
      r.percentage != null
        ? r.percentage
        : total
          ? Math.round((Number(r.value) / total) * 100)
          : 0,
  }))
}

export default function SalesPipelineAndLeadSourcesWidget({
  pipelineData = [],
  leadSourcesData = [],
  onLeadSourceClick,
  defaultRange = 30,
}) {
  const slices = withPipelinePresentation(pipelineData)

  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className={chartCardClass}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">Sales Pipeline</h3>
          <ReportsDetailsButton
            title="Sales Pipeline — full details"
            metric="leads"
            rangeDays={defaultRange}
            columns={PIPELINE_DETAIL_COLUMNS}
          />
        </div>
        <div className="mt-5">
          <div className="relative mx-auto h-[200px] w-full max-w-[575px]">
            <div className="absolute left-1/2 top-1/2 h-[170px] w-[170px] -translate-x-1/2 -translate-y-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={slices} dataKey="value" cx="50%" cy="50%" innerRadius={0} outerRadius={84} stroke="none">
                    {slices.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {slices.slice(0, 5).map((item, i) => (
              <div key={item.name} className={PIPELINE_LABEL_POS[i]}>
                {item.name}: {item.percentage}%
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {slices.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={chartCardClass}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">Lead Sources</h3>
          <ReportsDetailsButton
            title="Lead Sources — full details"
            metric="leads"
            rangeDays={defaultRange}
            columns={LEAD_DETAIL_COLUMNS}
          />
        </div>
        <p className="text-xs text-muted-foreground">Click a bar to see leads from that source</p>
        <div className="mt-4 h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={leadSourcesData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: chartAxisStroke, fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={rechartsTooltipContentStyle} />
              <Bar
                dataKey="value"
                radius={[8, 8, 0, 0]}
                fill="url(#leadBarGradient)"
                onClick={(entry) => onLeadSourceClick?.(entry?.name)}
                className={onLeadSourceClick ? 'cursor-pointer' : undefined}
              />
              <defs>
                <linearGradient id="leadBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--bar-gradient-start)" />
                  <stop offset="100%" stopColor="var(--bar-gradient-end)" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
