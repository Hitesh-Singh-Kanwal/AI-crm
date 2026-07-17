'use client'

import { chartCardClass, Trend } from './shared'

const FALLBACK = { title: '—', value: '0', trend: '—', trendType: 'up' }

// The backend always returns kpiCards as the same 4 metrics in the same
// order (see reports.controller.js), so each card can safely be its own
// widget selected by index rather than needing a name-based lookup.
export default function SingleKpiCardWidget({ kpiCards = [], index }) {
  const card = kpiCards[index] || FALLBACK
  return (
    <div className={chartCardClass}>
      <p className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
        {card.title}
      </p>
      <h3 className="mt-1 text-[38px] font-bold leading-[1.21] bg-gradient-to-b from-muted-foreground to-foreground bg-clip-text text-transparent">
        {card.value}
      </h3>
      <Trend type={card.trendType} text={card.trend} />
    </div>
  )
}
