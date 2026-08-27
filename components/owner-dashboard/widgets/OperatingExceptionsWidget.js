'use client'

import { AlertTriangle } from 'lucide-react'
import { Card } from '@/components/dashboard/widgets/shared'
import RangeDropdown from './RangeDropdown'

/**
 * Operating Exceptions — booking risk, capacity ceilings and goal shortfalls,
 * each checked against a fixed threshold on the owner-overview endpoint.
 * Ported from the sectioned dashboard's ActionsSection into the widget-grid
 * design. `exceptions` is spread in by withOwnRange from the owner-overview
 * payload (`exceptions.rows`).
 */
const SEVERITY_TONE = {
  red: 'bg-destructive',
  amber: 'bg-warning',
}

function ExceptionRow({ row }) {
  return (
    <div className="flex items-start gap-2.5 border-b border-border/60 py-3 last:border-b-0">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_TONE[row.severity] || 'bg-muted-foreground'}`} />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{row.category}</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-foreground">{row.message}</p>
      </div>
    </div>
  )
}

export default function OperatingExceptionsWidget({ exceptions, rangeDays, onRangeChange }) {
  const rows = exceptions?.rows || []

  return (
    <section className="flex h-full flex-col gap-3">
      {onRangeChange && (
        <div className="flex items-center justify-end">
          <RangeDropdown value={rangeDays} onChange={onRangeChange} />
        </div>
      )}
      <Card className="flex-1">
        {rows.length ? (
          <div>
            {rows.map((row, i) => (
              <ExceptionRow key={`${row.category}-${row.studio}-${i}`} row={row} />
            ))}
          </div>
        ) : (
          <div className="flex h-[180px] flex-col items-center justify-center gap-2 px-4 text-center">
            <AlertTriangle className="h-7 w-7 text-muted-foreground/35" aria-hidden />
            <p className="text-sm text-muted-foreground">
              No exceptions — every studio and instructor is within threshold.
            </p>
          </div>
        )}
        <p className="mt-3 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
          Booking risk, capacity ceilings and goal shortfalls, each checked against a fixed threshold — not yet
          configurable per organisation.
        </p>
      </Card>
    </section>
  )
}
