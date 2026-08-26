'use client'

import { delta, pointDelta } from '@/lib/hooks/useOwnerDashboardPage'
import { DeltaPill, Reveal, SectionHead, money, num } from '../chrome'

/**
 * Every card is one scalar from the owner-overview payload, badged against the
 * prior period and the same window a year ago. A card whose metric the backend
 * cannot produce still renders — it shows an em dash and says what is missing,
 * so the scorecard keeps its shape instead of silently losing a tile.
 */
function buildCards({ current, previous, lastYear }) {
  const cur = current || {}
  const prev = previous || {}
  const ly = lastYear || {}

  const value = (v, fmt) => (v === null || v === undefined ? null : fmt(v))
  const ratio = (key) => ({ mom: delta(cur[key], prev[key]), yoy: delta(cur[key], ly[key]) })
  const points = (key) => ({ mom: pointDelta(cur[key], prev[key]), yoy: pointDelta(cur[key], ly[key]) })

  return [
    {
      label: 'Revenue',
      value: value(cur.revenue, money),
      href: 'od-revenue',
      ...ratio('revenue'),
    },
    {
      label: 'Lessons',
      value: value(cur.lessons, num),
      href: 'od-lessons',
      ...ratio('lessons'),
    },
    {
      label: 'Leads',
      value: value(cur.leads, num),
      href: 'od-marketing',
      ...ratio('leads'),
    },
    {
      label: 'Intros Taught',
      value: value(cur.introsTaught, num),
      href: 'od-conversions',
      note: cur.introsBooked !== null ? `${num(cur.introsBooked)} booked in this window` : null,
      ...ratio('introsTaught'),
    },
    {
      label: 'Lead → Intro',
      value: value(cur.leadToIntroPct, (v) => `${v}%`),
      href: 'od-conversions',
      ...points('leadToIntroPct'),
    },
    {
      label: 'Intro → First Purchase',
      value: value(cur.introToPurchasePct, (v) => `${v}%`),
      href: 'od-conversions',
      note: cur.firstPurchases !== null ? `${num(cur.firstPurchases)} first purchases` : null,
      ...points('introToPurchasePct'),
    },
    {
      // Needs "enrolled into the first curriculum tier, within this window,
      // attributed to an intro". curriculumProgression only reports lifetime
      // highest tier reached, which is not window-scoped and cannot be divided
      // by intros taught.
      label: 'Intro → Starter',
      value: null,
      href: 'od-conversions',
      unavailable: 'Needs per-period first-tier enrolments attributed to an intro.',
    },
    {
      label: 'Booked %',
      value: value(cur.bookedPct, (v) => `${v}%`),
      href: 'od-health',
      note:
        cur.activeStudents !== null
          ? `${num(Math.round(((cur.bookedPct || 0) / 100) * cur.activeStudents))} booked of ${num(cur.activeStudents)} active`
          : null,
      ...points('bookedPct'),
    },
    {
      // forecastByStudio counts all scheduled lessons; it is not split by
      // lesson type, so intro-only scheduling cannot be isolated.
      label: 'Intros Scheduled',
      value: null,
      href: 'od-forecast',
      unavailable: 'Scheduled-lesson forecast is not split by lesson type.',
    },
    {
      label: 'Lessons Scheduled',
      value: value(cur.scheduled, num),
      href: 'od-forecast',
      note: 'Confirmed future lessons',
      ...ratio('scheduled'),
    },
    {
      label: 'Teacher Utilization',
      value: value(cur.utilizationPct, (v) => `${v}%`),
      href: 'od-capacity',
      note:
        cur.actualPerWeek !== null && cur.capacityPerWeek
          ? `${cur.actualPerWeek} of ${num(cur.capacityPerWeek)} lessons/wk`
          : null,
      ...points('utilizationPct'),
    },
  ]
}

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function KpiCell({ card }) {
  return (
    <button
      type="button"
      onClick={() => scrollTo(card.href)}
      className="group relative p-5 pr-16 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--studio-primary)_4%,hsl(var(--card)))]"
    >
      <span className="absolute right-5 top-[18px] text-[8.5px] font-bold tracking-[0.18em] text-muted-foreground/60 transition-colors group-hover:text-[var(--studio-primary)]">
        VIEW &#9656;
      </span>
      <p className="text-[9.5px] font-bold uppercase tracking-[0.24em] text-muted-foreground">{card.label}</p>
      <p className="od-figure my-3 text-[clamp(26px,2.1vw,33px)] leading-none text-[var(--studio-primary)]">
        {card.value ?? <span className="text-muted-foreground/50">&mdash;</span>}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <DeltaPill d={card.mom} label="MoM" />
        <DeltaPill d={card.yoy} label="YoY" />
      </div>
      {(card.note || card.unavailable) && (
        <p className="mt-2.5 text-[10.5px] leading-relaxed text-muted-foreground">{card.unavailable || card.note}</p>
      )}
    </button>
  )
}

export default function ScorecardSection({ summaries }) {
  const cards = buildCards(summaries)

  return (
    <section id="od-scorecard" className="mt-24 scroll-mt-32 first:mt-0">
      <SectionHead
        number="01"
        title="Executive"
        emphasis="Scorecard"
        tag="Q1 · ARE WE GROWING?"
        subtitle="The full health check — every card jumps to the evidence behind it."
      />
      <Reveal delay={1}>
        <div className="od-bento grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <KpiCell key={card.label} card={card} />
          ))}
        </div>
      </Reveal>
    </section>
  )
}
