'use client'

const PRESETS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '12M', days: 365 },
]

/** Compact date-range segmented control for dashboard / reports toolbars. */
export default function DateRangePresets({ value, onChange }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-background p-0.5">
      {PRESETS.map((preset) => (
        <button
          key={preset.days}
          type="button"
          onClick={() => onChange(preset.days)}
          className={[
            'h-7 min-w-[36px] rounded px-2.5 text-[12px] font-medium transition-colors',
            value === preset.days
              ? 'bg-brand text-brand-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {preset.label}
        </button>
      ))}
    </div>
  )
}
