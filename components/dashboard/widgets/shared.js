// Shared visual helpers for dashboard/report widgets.
export const PRIMARY = 'var(--studio-primary)'
export const GRADIENT_COLOR = 'var(--studio-gradient)'

export function SectionLabel({ children }) {
  return (
    <p className="mb-2 font-bold text-base tracking-[0.12em] uppercase text-[var(--studio-primary)]">
      {children}
    </p>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div
      className={`h-full bg-card text-card-foreground border border-border shadow-sm ${className} overflow-hidden`}
      style={{ borderRadius: 20 }}
    >
      {children}
    </div>
  )
}
