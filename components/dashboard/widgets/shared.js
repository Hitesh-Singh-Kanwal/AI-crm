// Shared visual helpers — matched to reports widgets (chartCardClass / titles).
export const PRIMARY = 'var(--studio-primary)'
export const GRADIENT_COLOR = 'var(--studio-gradient)'

/** Higher-contrast pink → magenta palette for pie/donut slices. */
export const CHART_COLORS = [
  '#F72585',
  '#FA6DAD',
  '#E12279',
  '#C81D77',
  '#FB9BC7',
  '#45B7DA',
  '#4CC9F0',
  '#ADE6F8',
]

export const SIZE_OPTIONS = [
  { id: 'quarter', label: '1/4', title: 'Quarter width', cols: 3 },
  { id: 'third', label: '1/3', title: 'Third width', cols: 4 },
  { id: 'half', label: '1/2', title: 'Half width', cols: 6 },
  { id: 'full', label: 'Full', title: 'Full width', cols: 12 },
]

/** Same card chrome as reports `chartCardClass`. */
export const chartCardClass =
  'h-full rounded-[20px] border-2 p-5 bg-card border-border text-card-foreground shadow-sm'

export function SectionLabel({ children, as: Tag = 'h3' }) {
  return (
    <Tag className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
      {children}
    </Tag>
  )
}

export function Card({ children, className = '' }) {
  return <div className={`${chartCardClass} ${className}`.trim()}>{children}</div>
}

export function Trend({ type = 'up', text }) {
  const isUp = type === 'up'
  return (
    <div
      className={`mt-1 flex items-center gap-1 text-[14px] font-medium ${
        isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      }`}
    >
      <span aria-hidden>{isUp ? '↗' : '↘'}</span>
      <span>{text}</span>
    </div>
  )
}

export function EmptyChart({ message = 'No data for this period.' }) {
  return (
    <div className="flex h-[240px] flex-col items-center justify-center gap-1 px-4 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
