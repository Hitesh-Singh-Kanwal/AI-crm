'use client'

import { useEffect, useMemo, useState } from 'react'
import DateRangePresets from '@/components/dashboard-builder/DateRangePresets'
import { Button } from '@/components/ui/button'
import { delta, pointDelta, useOwnerDashboardPage } from '@/lib/hooks/useOwnerDashboardPage'
import { Chip, DeltaPill, Eyebrow, Foil, money, num } from './chrome'
import ScorecardSection from './sections/ScorecardSection'
import RevenueSection from './sections/RevenueSection'
import LessonsSection from './sections/LessonsSection'
import ForecastSection from './sections/ForecastSection'
import CapacitySection from './sections/CapacitySection'
import ConversionsSection from './sections/ConversionsSection'
import MarketingSection from './sections/MarketingSection'
import StudentHealthSection from './sections/StudentHealthSection'
import ActionsSection from './sections/ActionsSection'

/* ── sticky section nav ─────────────────────────────────────────────────── */

/**
 * Highlights whichever section currently owns the middle of the viewport.
 * Observes only the ids that actually rendered, so a section hidden by
 * permissions never leaves a dead link behind.
 */
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0])

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-25% 0px -65% 0px' }
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [ids])

  return active
}

/**
 * Scrolls smoothly to a section. MainLayout's <main> is the scroll container,
 * not the document, so a plain hash jump lands hard — scrollIntoView animates
 * whichever ancestor actually scrolls. The href stays for keyboard and
 * middle-click behaviour.
 */
function jumpTo(e, id) {
  const el = document.getElementById(id)
  if (!el) return
  e.preventDefault()
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function SectionNav({ sections }) {
  const ids = useMemo(() => sections.map((s) => s.id), [sections])
  const active = useActiveSection(ids)

  // This bar bleeds out over MainLayout's <main>, which is the scroll container
  // and carries `px-3 py-3 sm:px-4 sm:py-4 lg:px-2`. Two consequences:
  //
  //  - Horizontal: negative margins matching that padding make the bar
  //    full-bleed rather than floating inset like the cards.
  //  - Vertical: a sticky `top-0` resolves against the scroll container's
  //    PADDING box, so the bar pins *below* main's padding-top and cards scroll
  //    visibly through the strip above it. Rather than fight that with negative
  //    margins (how engines resolve a sticky inset against a negative margin
  //    varies), the ::before paints an opaque strip directly above the bar that
  //    travels with it and hides anything passing behind.
  //
  //  - The background stays fully opaque: translucency only reads correctly
  //    where backdrop-filter applies, which inside a scroll container it often
  //    does not, and the fallback is plain alpha with content showing through.
  //
  // The pills WRAP rather than scroll: an `overflow-x-auto` rail here clipped
  // the trailing pills whenever the row was wider than the viewport, and with
  // the scrollbar hidden there was nothing to signal they were there. Wrapping
  // keeps a single row wherever it fits and spills to a second row when it
  // doesn't, so no entry is ever hidden.
  return (
    <nav
      className="sticky top-0 z-40 -mx-3 border-b border-border bg-background px-3 py-2.5 shadow-[0_4px_12px_-8px_rgb(0_0_0/0.35)] sm:-mx-4 sm:px-4 lg:-mx-2 lg:px-2
        before:absolute before:inset-x-0 before:bottom-full before:h-6 before:bg-background before:content-['']"
    >
      <div className="flex flex-wrap gap-1.5">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => jumpTo(e, s.id)}
            className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-[9.5px] font-bold tracking-[0.16em] transition-colors ${
              active === s.id
                ? 'border-[var(--studio-primary)] bg-[var(--studio-primary)] text-brand-foreground'
                : 'border-transparent text-muted-foreground hover:border-[color-mix(in_srgb,var(--studio-primary)_30%,transparent)] hover:text-foreground'
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

/* ── hero ───────────────────────────────────────────────────────────────── */

function HeroStat({ label, value, mom, yoy }) {
  return (
    <div className="p-6 transition-colors hover:bg-[color-mix(in_srgb,var(--studio-primary)_4%,hsl(var(--card)))]">
      <p className="text-[9.5px] font-bold uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
      <p className="od-figure my-3 text-[clamp(32px,3.4vw,50px)] leading-none">
        <Foil>{value ?? '—'}</Foil>
      </p>
      <div className="flex flex-wrap gap-1.5">
        <DeltaPill d={mom} label="MoM" />
        <DeltaPill d={yoy} label="YoY" />
      </div>
    </div>
  )
}

function Hero({ summaries, periodLabel }) {
  const cur = summaries.current || {}
  const prev = summaries.previous || {}
  const ly = summaries.lastYear || {}

  const stats = [
    {
      label: `Revenue · ${periodLabel}`,
      value: cur.revenue !== null && cur.revenue !== undefined ? money(cur.revenue) : null,
      mom: delta(cur.revenue, prev.revenue),
      yoy: delta(cur.revenue, ly.revenue),
    },
    {
      label: 'Lessons Taught',
      value: cur.lessons !== null && cur.lessons !== undefined ? num(cur.lessons) : null,
      mom: delta(cur.lessons, prev.lessons),
      yoy: delta(cur.lessons, ly.lessons),
    },
    {
      label: 'Lessons Scheduled',
      value: cur.scheduled !== null && cur.scheduled !== undefined ? num(cur.scheduled) : null,
      mom: delta(cur.scheduled, prev.scheduled),
      yoy: delta(cur.scheduled, ly.scheduled),
    },
    {
      label: 'Currently Booked',
      value: cur.bookedPct !== null && cur.bookedPct !== undefined ? `${cur.bookedPct}%` : null,
      mom: pointDelta(cur.bookedPct, prev.bookedPct),
      yoy: pointDelta(cur.bookedPct, ly.bookedPct),
    },
  ]

  return (
    <div className="relative overflow-hidden py-14 sm:py-16">
      <div
        className="pointer-events-none absolute -top-56 left-1/2 h-[520px] w-[900px] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(ellipse at center, color-mix(in srgb, var(--studio-primary) 14%, transparent), transparent 65%)',
        }}
        aria-hidden
      />
      <div className="relative">
        <Eyebrow>Organization Owner · Executive Operating System</Eyebrow>
        <h1 className="od-display mt-6 text-[clamp(38px,5.4vw,76px)] leading-[1.02] text-foreground">
          The 30-Second
          <br />
          <em className="italic">
            <Foil>Board Meeting.</Foil>
          </em>
        </h1>
        <p className="mt-5 max-w-[780px] text-[15px] font-light leading-[1.75] text-muted-foreground">
          Growth, money, capacity, conversions, marketing, engagement, priorities — every question an owner asks,
          answered on one screen. One navigation pattern everywhere:{' '}
          <b className="font-bold text-[var(--studio-primary)]">Organization → Studio → Instructor → Customer</b>.
        </p>
        <div className="od-bento mt-12 grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <HeroStat key={s.label} {...s} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── page ───────────────────────────────────────────────────────────────── */

function periodLabelFor(range) {
  if (range && typeof range === 'object') return `${range.from} → ${range.to}`
  if (range === 7) return 'Last 7 days'
  if (range === 90) return 'Last 90 days'
  if (range === 365) return 'Last 12 months'
  return 'Last 30 days'
}

function Skeleton() {
  return (
    <div className="space-y-4 py-10">
      <div className="h-40 animate-pulse rounded-[20px] bg-muted/50" />
      <div className="h-64 animate-pulse rounded-[20px] bg-muted/40" />
      <div className="h-64 animate-pulse rounded-[20px] bg-muted/30" />
    </div>
  )
}

export default function OwnerDashboardPage() {
  const [range, setRange] = useState(30)
  const { data, classic, summaries, comparisons, error, isLoading, isValidating, refresh } = useOwnerDashboardPage(range)

  const periodLabel = periodLabelFor(range)

  // Each owner-overview section is permission-gated server side, so an absent
  // key means "this user may not see it" — the section and its nav entry are
  // dropped rather than rendered as a wall of empty states.
  const sections = useMemo(() => {
    const list = [{ id: 'od-scorecard', label: 'SCORECARD' }]
    if (data?.revenue) list.push({ id: 'od-revenue', label: 'REVENUE' })
    if (data?.lessons) {
      list.push({ id: 'od-lessons', label: 'LESSONS' })
      list.push({ id: 'od-forecast', label: 'FORECAST' })
      list.push({ id: 'od-capacity', label: 'UTILIZATION' })
    }
    if (data?.funnel) list.push({ id: 'od-conversions', label: 'CONVERSIONS' })
    list.push({ id: 'od-marketing', label: 'MARKETING' })
    if (data?.studentHealth) list.push({ id: 'od-health', label: 'STUDENT HEALTH' })
    list.push({ id: 'od-actions', label: 'PRIORITIES' })
    return list
  }, [data])

  const shared = { data, classic, comparisons, summaries, rangeDays: range }

  return (
    <div className="pb-20">
      <header className="flex flex-wrap items-center justify-between gap-4 pb-5 pt-1">
        <div>
          <p className="text-[15px] font-bold tracking-[0.2em] text-foreground">
            OWNER <span className="text-[var(--studio-primary)]">DASHBOARD</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {isValidating && <span className="text-[11px] text-muted-foreground">Updating…</span>}
          <Chip>{periodLabel.toUpperCase()}</Chip>
          <Chip ghost>ORGANIZATION SCOPE</Chip>
          <DateRangePresets value={range} onChange={setRange} />
        </div>
      </header>

      <SectionNav sections={sections} />

      {error && !data && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-foreground">
            Couldn&apos;t load dashboard data.{' '}
            <span className="text-muted-foreground">{error.message || 'Please try again.'}</span>
          </p>
          <Button variant="outline" size="sm" className="h-8" onClick={() => refresh()}>
            Retry
          </Button>
        </div>
      )}

      {isLoading ? (
        <Skeleton />
      ) : (
        <>
          <Hero summaries={summaries} periodLabel={periodLabel} />

          <ScorecardSection summaries={summaries} />
          {data?.revenue && <RevenueSection {...shared} />}
          {data?.lessons && (
            <>
              <LessonsSection {...shared} />
              <ForecastSection {...shared} />
              <CapacitySection {...shared} />
            </>
          )}
          {data?.funnel && <ConversionsSection {...shared} />}
          <MarketingSection {...shared} />
          {data?.studentHealth && <StudentHealthSection {...shared} />}
          <ActionsSection {...shared} />

          <p className="mt-20 text-center text-[10px] font-semibold tracking-[0.22em] text-muted-foreground">
            DRILL-DOWN HIERARCHY &nbsp;·&nbsp; <b className="text-[var(--studio-primary)]">ORGANIZATION</b> → STUDIO →
            INSTRUCTOR → CUSTOMER &nbsp;·&nbsp; ONE NAVIGATION PATTERN EVERYWHERE
          </p>
        </>
      )}
    </div>
  )
}
