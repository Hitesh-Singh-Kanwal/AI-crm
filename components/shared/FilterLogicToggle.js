'use client'

import { cn } from '@/lib/utils'
import { CONDITION_LOGIC_OPTIONS } from '@/lib/dynamic-list-constants'

const DEFAULT_HELP = {
  AND: 'A lead must be present in all filters to appear in the segment.',
  OR: 'A lead must be present in at least one filter to appear in the segment.',
}

export default function FilterLogicToggle({
  value = 'AND',
  onChange,
  className,
  label = 'Match filters using',
  helpText,
  size = 'md',
}) {
  const help = helpText || DEFAULT_HELP[value] || DEFAULT_HELP.AND
  const isCompact = size === 'sm'

  return (
    <div className={cn('space-y-2.5', className)}>
      {!isCompact && label ? (
        <div className="text-[12px] font-medium text-muted-foreground">{label}</div>
      ) : null}

      <div className={cn('flex gap-2', isCompact && 'gap-1.5')}>
        {CONDITION_LOGIC_OPTIONS.map((logic) => (
          <button
            key={logic}
            type="button"
            onClick={() => onChange?.(logic)}
            className={cn(
              'rounded-lg border px-5 py-1.5 text-[13px] font-semibold transition',
              isCompact && 'rounded-md px-3.5 py-1 text-[12px]',
              value === logic
                ? 'border-[var(--studio-primary)] bg-[var(--studio-primary)]/10 text-[var(--studio-primary)]'
                : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
            )}
          >
            {logic}
          </button>
        ))}
      </div>

      {help ? (
        <div
          className={cn(
            'rounded-xl bg-muted/50 px-3.5 py-2.5 text-[12px] leading-relaxed text-muted-foreground',
            isCompact && 'rounded-lg px-3 py-2 text-[11px]'
          )}
        >
          {help}
        </div>
      ) : null}
    </div>
  )
}
