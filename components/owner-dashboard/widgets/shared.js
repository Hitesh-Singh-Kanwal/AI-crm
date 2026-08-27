'use client'

/**
 * Ranked horizontal bar list — label, inline track, value.
 * Mirrors the "hrow" pattern used across the owner dashboard concept, restyled
 * with this app's card/typography tokens instead of a bespoke theme.
 */
export function RankedBarList({ rows = [], valueFormatter = (v) => v.toLocaleString(), sublabelFormatter, highlightFirst = true }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="flex flex-col">
      {rows.map((r, i) => {
        const pct = Math.max((r.value / max) * 100, r.value > 0 ? 2 : 0)
        const first = highlightFirst && i === 0
        return (
          <div key={r.label} className="grid grid-cols-[minmax(0,110px)_1fr_auto] items-center gap-3 py-1.5">
            <span className="truncate text-[12px] font-semibold text-foreground" title={r.label}>
              {r.label}
              {r.sublabel && <span className="ml-1 text-[10px] font-normal text-muted-foreground">{r.sublabel}</span>}
            </span>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: first
                    ? 'linear-gradient(90deg, var(--bar-gradient-start), var(--bar-gradient-end))'
                    : 'color-mix(in srgb, var(--studio-primary) 28%, transparent)',
                }}
              />
            </div>
            <span className={`text-right text-[12px] font-bold tabular-nums ${first ? 'text-[var(--studio-primary)]' : 'text-muted-foreground'}`}>
              {valueFormatter(r.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Two-segment stacked bar row (e.g. booked vs. not-booked) with a summary value on the right. */
export function StackedBarRow({ rows = [] }) {
  const max = Math.max(...rows.map((r) => r.a + r.b), 1)
  return (
    <div className="flex flex-col">
      {rows.map((r) => {
        const total = r.a + r.b
        const widthPct = Math.max((total / max) * 100, total > 0 ? 2 : 0)
        const aShare = total ? (r.a / total) * 100 : 0
        return (
          <div key={r.label} className="grid grid-cols-[minmax(0,120px)_1fr_54px] items-center gap-3 py-1.5">
            <span className="truncate text-[12px] font-semibold text-foreground" title={r.label}>
              {r.label}
              {r.sublabel && <span className="block text-[10px] font-normal text-muted-foreground">{r.sublabel}</span>}
            </span>
            <div className="flex h-4 overflow-hidden rounded-full bg-muted" style={{ width: `${widthPct}%` }}>
              <div className="h-full" style={{ width: `${aShare}%`, background: 'var(--studio-primary)' }} />
              <div className="h-full flex-1" style={{ background: 'color-mix(in srgb, var(--studio-primary) 15%, transparent)' }} />
            </div>
            <span className="text-right text-[12px] font-bold tabular-nums text-foreground">{r.valueLabel}</span>
          </div>
        )
      })}
    </div>
  )
}

/**
 * A single stage card in a connected funnel. Grows to share the row width
 * equally with its siblings (down to a min width, below which the row scrolls).
 * `barPct` (0–100) draws a proportion bar so the funnel's narrowing is visible
 * at a glance, not just in the numbers.
 */
export function FunnelStage({ label, value, metrics = [], barPct = null, highlight = false, onClick, active = false }) {
  const Tag = onClick ? 'button' : 'div'
  const emphasized = highlight || active
  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`flex min-w-[150px] flex-1 flex-col rounded-2xl border p-4 text-left transition-colors ${
        onClick ? 'cursor-pointer hover:border-[var(--studio-primary)] hover:shadow-sm' : ''
      } ${
        emphasized
          ? 'border-[var(--studio-primary)] bg-[color-mix(in_srgb,var(--studio-primary)_7%,transparent)]'
          : 'border-border bg-card'
      }`}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 bg-gradient-to-b from-muted-foreground to-foreground bg-clip-text text-[28px] font-bold leading-none tabular-nums text-transparent">
        {value}
      </p>
      {barPct !== null && (
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.max(barPct, barPct > 0 ? 4 : 0)}%`,
              background: 'linear-gradient(90deg, var(--bar-gradient-start), var(--bar-gradient-end))',
            }}
          />
        </div>
      )}
      {metrics.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-2.5">
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{m.label}</p>
              <p className="text-[13px] font-bold tabular-nums text-foreground">{m.value}</p>
            </div>
          ))}
        </div>
      )}
    </Tag>
  )
}

/** The arrow + conversion-rate connector between two funnel stages. */
export function FunnelConnector({ ratePct, caption }) {
  const weak = ratePct < 100
  return (
    <div className="flex w-[92px] shrink-0 flex-col items-center justify-center gap-1 px-1 text-center">
      <span
        className={`rounded-full px-2 py-0.5 text-[12.5px] font-bold tabular-nums ${
          weak ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
        }`}
      >
        {ratePct}%
      </span>
      <div className="flex w-full items-center text-[var(--studio-primary)]" aria-hidden>
        <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--studio-primary)_40%,transparent)]" />
        <span className="-ml-0.5 text-[11px] leading-none">&#9656;</span>
      </div>
      {caption && <span className="text-[9px] leading-tight text-muted-foreground">{caption}</span>}
    </div>
  )
}
