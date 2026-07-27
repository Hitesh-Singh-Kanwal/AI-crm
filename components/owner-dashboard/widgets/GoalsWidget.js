'use client'

import { Card, SectionLabel, EmptyChart } from '@/components/dashboard/widgets/shared'

function formatValue(metric, n) {
  const num = Number(n) || 0
  if (metric === 'revenue') {
    if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
    if (Math.abs(num) >= 10000) return `$${(num / 1000).toFixed(1)}k`
    return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  }
  return num.toLocaleString()
}

function GoalRow({ label, actual, target, pct, metric }) {
  const clamped = pct === null ? 0 : Math.min(pct, 100)
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-semibold text-foreground">{label}</span>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {formatValue(metric, actual)}
          {target !== null && <> / {formatValue(metric, target)}</>}
        </span>
      </div>
      {target !== null ? (
        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.max(clamped, actual > 0 ? 2 : 0)}%`,
              background:
                pct >= 100
                  ? 'linear-gradient(90deg, var(--bar-gradient-start), var(--bar-gradient-end))'
                  : 'color-mix(in srgb, var(--studio-primary) 40%, transparent)',
            }}
          />
        </div>
      ) : (
        <p className="mt-1 text-[10px] text-muted-foreground">No goal set for this month.</p>
      )}
    </div>
  )
}

export default function GoalsWidget({ goals }) {
  const metrics = goals?.metrics || []
  const anyTargetSet = metrics.some((m) => m.target !== null)

  return (
    <Card>
      <SectionLabel>Goals This Month</SectionLabel>
      {metrics.length > 0 ? (
        <div className="mt-2 divide-y divide-border">
          {metrics.map((m) => (
            <GoalRow key={m.metric} label={m.label} actual={m.actual} target={m.target} pct={m.pct} metric={m.metric} />
          ))}
        </div>
      ) : (
        <EmptyChart message="No goals configured." />
      )}
      {!anyTargetSet && metrics.length > 0 && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Set targets in Settings &rarr; Goals.
        </p>
      )}
    </Card>
  )
}
