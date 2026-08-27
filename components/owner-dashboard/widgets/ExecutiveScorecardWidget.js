'use client'

import { useOwnerDashboardPage, delta, pointDelta } from '@/lib/hooks/useOwnerDashboardPage'
import { Card, Trend } from '@/components/dashboard/widgets/shared'
import RangeDropdown from './RangeDropdown'

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`
const num = (n) => Math.round(Number(n) || 0).toLocaleString()

/**
 * The Executive Scorecard — headline metrics from the owner-overview payload,
 * each badged against the prior period (MoM) and the same window a year ago
 * (YoY). Ported from the sectioned dashboard's ScorecardSection into the
 * classic widget-grid design (Card + Trend), so the two dashboards share one
 * look. A metric the backend can't produce still renders as an em dash with a
 * short note, so the grid keeps its shape.
 */
function buildCards({ current, previous, lastYear }) {
  const cur = current || {}
  const prev = previous || {}
  const ly = lastYear || {}

  const value = (v, fmt) => (v === null || v === undefined ? null : fmt(v))
  const ratio = (key) => ({ mom: delta(cur[key], prev[key]), yoy: delta(cur[key], ly[key]) })
  const points = (key) => ({ mom: pointDelta(cur[key], prev[key]), yoy: pointDelta(cur[key], ly[key]) })

  return [
    { label: 'Revenue', value: value(cur.revenue, money), ...ratio('revenue') },
    { label: 'Lessons', value: value(cur.lessons, num), ...ratio('lessons') },
    { label: 'Leads', value: value(cur.leads, num), ...ratio('leads') },
    {
      label: 'Intros Taught',
      value: value(cur.introsTaught, num),
      note: cur.introsBooked !== null && cur.introsBooked !== undefined ? `${num(cur.introsBooked)} booked in this window` : null,
      ...ratio('introsTaught'),
    },
    { label: 'Lead → Intro', value: value(cur.leadToIntroPct, (v) => `${v}%`), ...points('leadToIntroPct') },
    {
      label: 'Intro → First Purchase',
      value: value(cur.introToPurchasePct, (v) => `${v}%`),
      note: cur.firstPurchases !== null && cur.firstPurchases !== undefined ? `${num(cur.firstPurchases)} first purchases` : null,
      ...points('introToPurchasePct'),
    },
    {
      label: 'Booked %',
      value: value(cur.bookedPct, (v) => `${v}%`),
      note:
        cur.activeStudents !== null && cur.activeStudents !== undefined
          ? `${num(Math.round(((cur.bookedPct || 0) / 100) * cur.activeStudents))} booked of ${num(cur.activeStudents)} active`
          : null,
      ...points('bookedPct'),
    },
    {
      label: 'Lessons Scheduled',
      value: value(cur.scheduled, num),
      note: 'Confirmed future lessons',
      ...ratio('scheduled'),
    },
    {
      label: 'Teacher Utilization',
      value: value(cur.utilizationPct, (v) => `${v}%`),
      note:
        cur.actualPerWeek !== null && cur.actualPerWeek !== undefined && cur.capacityPerWeek
          ? `${cur.actualPerWeek} of ${num(cur.capacityPerWeek)} lessons/wk`
          : null,
      ...ratio('utilizationPct'),
    },
  ]
}

/** One MoM / YoY badge from a delta()/pointDelta() result. `null` → nothing. */
function DeltaBadge({ d, label }) {
  if (!d) return null
  const suffix = d.points ? ' pp' : '%'
  const text = d.noBaseline
    ? 'New'
    : `${d.pct >= 0 ? '+' : ''}${d.pct.toFixed(1)}${suffix}`
  return (
    <Trend
      type={d.dir}
      text={`${label} ${text}`}
      label={`${label}: ${d.noBaseline ? 'no prior data to compare against' : text}`}
      className=""
    />
  )
}

export default function ExecutiveScorecardWidget({ rangeDays, onRangeChange }) {
  const { summaries, isLoading } = useOwnerDashboardPage(rangeDays)

  if (isLoading && !summaries?.current) {
    return <div className="h-64 animate-pulse rounded-xl bg-muted/40" />
  }

  const cards = buildCards(summaries)

  return (
    <section className="flex h-full flex-col gap-3">
      {onRangeChange && (
        <div className="flex items-center justify-end">
          <RangeDropdown value={rangeDays} onChange={onRangeChange} />
        </div>
      )}
      <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <p className="truncate text-[13px] font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">
              {card.label}
            </p>
            <h3 className="mt-2.5 bg-gradient-to-b from-muted-foreground to-foreground bg-clip-text text-[32px] font-bold leading-[1.21] text-transparent">
              {card.value ?? <span className="text-muted-foreground/50">—</span>}
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <DeltaBadge d={card.mom} label="MoM" />
              <DeltaBadge d={card.yoy} label="YoY" />
            </div>
            {card.note && <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{card.note}</p>}
          </Card>
        ))}
      </div>
    </section>
  )
}
