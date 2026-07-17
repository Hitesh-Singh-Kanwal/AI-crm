'use client'

import { chartCardClass, Trend } from './shared'

export default function KpiCardsWidget({ kpiCards = [] }) {
  return (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
      {kpiCards.map((card) => (
        <div key={card.title} className={chartCardClass}>
          <p className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
            {card.title}
          </p>
          <h3 className="mt-1 text-[38px] font-bold leading-[1.21] bg-gradient-to-b from-muted-foreground to-foreground bg-clip-text text-transparent">
            {card.value}
          </h3>
          <Trend type={card.trendType} text={card.trend} />
        </div>
      ))}
    </section>
  )
}
