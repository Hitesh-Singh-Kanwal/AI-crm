'use client'

import { cn } from '@/lib/utils'
import { CONDITION_LOGIC_OPTIONS } from '@/lib/dynamic-list-constants'

export default function FilterLogicToggle({ value = 'AND', onChange, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 px-3 py-2.5', className)}>
      <span className="text-[12px] font-medium text-muted-foreground">Match filters using</span>
      <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
        {CONDITION_LOGIC_OPTIONS.map((logic) => (
          <button
            key={logic}
            type="button"
            onClick={() => onChange?.(logic)}
            className={cn(
              'rounded-md px-2.5 py-1 text-[11px] font-semibold',
              value === logic
                ? 'bg-[var(--studio-primary)] text-white'
                : 'text-muted-foreground hover:bg-muted/40'
            )}
          >
            {logic}
          </button>
        ))}
      </div>
    </div>
  )
}
