import { cn } from '@/lib/utils'

/** Small radio-style toggle used across the inbox composers. */
export default function Segmented({ label, value, onChange, options }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full flex-wrap rounded-lg border border-border bg-muted/40 p-1">
      {options.map(({ id, label: text, Icon, disabled }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          disabled={disabled}
          onClick={() => onChange(id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40',
            value === id
              ? 'bg-card text-[color:var(--studio-primary)] shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {Icon && <Icon className="h-4 w-4" aria-hidden />}
          {text}
        </button>
      ))}
    </div>
  )
}
