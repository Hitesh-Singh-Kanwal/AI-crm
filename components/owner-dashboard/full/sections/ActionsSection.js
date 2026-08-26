'use client'

import { Caveat, Empty, NotAvailable, Panel, PanelHead, Reveal, SectionHead } from '../chrome'

/** The priority tiers the concept colour-codes each worklist row by. */
const SEVERITY_TONE = {
  red: 'bg-destructive',
  amber: 'bg-warning',
}

function ExceptionRow({ row }) {
  return (
    <div className="flex items-start gap-2.5 border-b border-border/60 py-3 last:border-b-0">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_TONE[row.severity] || 'bg-muted-foreground'}`} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{row.category}</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-foreground">{row.message}</p>
      </div>
    </div>
  )
}

export default function ActionsSection({ data }) {
  const exceptions = data?.exceptions?.rows || []

  return (
    <section id="od-actions" className="mt-24 scroll-mt-32">
      <SectionHead
        number="09"
        title="Priority Actions &"
        emphasis="Exceptions"
        tag="Q8 · WHAT NEEDS ATTENTION?"
        subtitle="One worklist — student opportunities on the left, operating exceptions on the right, highest priority first."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal delay={1}>
          <Panel className="h-full">
            <PanelHead title="Student Opportunities" note="ranked within the selected studio" />
            <NotAvailable
              message="Per-student opportunity ranking is not built yet."
              requires="Needs configurable rules evaluated per student — ready for the next tier, renewal overdue, showcase eligible, no future booking — each with an attached revenue value. The overview endpoints return aggregates only, never per-student flags."
              height={280}
            />
            <Caveat>Once scored, each row reads: student · why they surfaced · revenue at stake.</Caveat>
          </Panel>
        </Reveal>

        <Reveal delay={2}>
          <Panel className="h-full">
            <PanelHead title="Operating Exceptions" note="highest-priority issues first" />
            {exceptions.length ? (
              <div className="mt-3">
                {exceptions.map((row, i) => (
                  <ExceptionRow key={`${row.category}-${row.studio}-${i}`} row={row} />
                ))}
              </div>
            ) : (
              <Empty message="No exceptions — every studio and instructor is within threshold." height={220} />
            )}
            <Caveat>
              Booking risk, capacity ceilings and goal shortfalls, each checked against a fixed threshold — not yet
              configurable per organisation. Funnel underperformance and progression slowdown aren&apos;t checked here:
              both need per-studio funnel figures this endpoint doesn&apos;t compute.
            </Caveat>
          </Panel>
        </Reveal>
      </div>
    </section>
  )
}
