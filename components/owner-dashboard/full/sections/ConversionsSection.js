'use client'

import { Fragment, useMemo, useState } from 'react'
import DetailsButton from '@/components/owner-dashboard/widgets/DetailsButton'
import { Caveat, Empty, Eyebrow, Foil, Legend, NotAvailable, Panel, PanelHead, Reveal, SectionHead, money, moneyShort, num } from '../chrome'
import { Connector, Flow, MixBars, MultiLine, Stage } from '../viz'

const FUNNEL_COLUMNS = [
  { key: 'name', label: 'Lead' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'studio', label: 'Studio' },
  { key: 'createdAt', label: 'Created', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'introBooked', label: 'Intro Booked' },
  { key: 'introAttended', label: 'Intro Attended' },
  { key: 'firstPurchase', label: 'First Purchase' },
]

const JOURNEY_COLUMNS = [
  { key: 'name', label: 'Customer' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'studio', label: 'Studio' },
  { key: 'purchaseCount', label: 'Purchases' },
  { key: 'totalLtv', label: 'Total LTV', format: money },
  { key: 'lastPurchase', label: 'Last Purchase', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
]

const PROGRESSION_COLUMNS = [
  { key: 'name', label: 'Customer' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'studio', label: 'Studio' },
  { key: 'highestTier', label: 'Highest Tier Reached' },
]

const TREND_SERIES = [
  { key: 'leadToIntro', label: 'Lead → Intro', color: 'var(--chart-1)' },
  { key: 'introToPurchase', label: 'Intro → First Purchase', color: 'var(--chart-5)' },
]

const pctOf = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : '0%')

/** Distinct colour per first-purchase product category, in a fixed, memorable order. */
const PRODUCT_MIX_COLORS = {
  'Curriculum Package': 'var(--chart-1)',
  'Other Package': 'var(--chart-5)',
  Membership: 'var(--chart-2)',
  'Single Session': 'var(--chart-6)',
  Other: 'var(--chart-7)',
}

/** Report card shell — eyebrow, display heading, and a right-aligned method note. */
function Report({ eyebrow, title, emphasis, note, detailsButton, children }) {
  return (
    <Reveal className="mt-4">
      <div className="rounded-[20px] border border-border bg-muted/30 p-6">
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h3 className="od-display mt-1.5 text-[24px] text-foreground">
              {title}{' '}
              {emphasis && (
                <em className="italic">
                  <Foil>{emphasis}</Foil>
                </em>
              )}
            </h3>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <p className="max-w-[400px] text-right text-[11px] leading-relaxed text-muted-foreground">{note}</p>
            {detailsButton}
          </div>
        </div>
        {children}
      </div>
    </Reveal>
  )
}

export default function ConversionsSection({ data, comparisons, rangeDays }) {
  const [journeyIndex, setJourneyIndex] = useState(0)
  const [tierIndex, setTierIndex] = useState(0)

  const funnel = data?.funnel
  const report1 = funnel?.report1
  const report2 = funnel?.report2
  const journey = useMemo(() => funnel?.report3?.purchaseJourney || [], [funnel])
  const progression = useMemo(() => funnel?.report4?.curriculumProgression || [], [funnel])

  const revenueByTier = useMemo(
    () => new Map((data?.revenue?.byCurriculum || []).map((r) => [r.tier, Number(r.revenue) || 0])),
    [data]
  )
  const lessonsByTier = useMemo(
    () => new Map((data?.lessons?.byCurriculum || []).map((r) => [r.tier, Number(r.count) || 0])),
    [data]
  )

  /**
   * A three-point rate history — this window, the window before it, and the
   * same window a year ago. It is not the concept's rolling 12-month line
   * (that would need twelve separate reads), but every point is real.
   */
  const trend = useMemo(() => {
    const point = (payload, label) => {
      if (!payload?.funnel) return null
      return {
        label,
        leadToIntro: Number(payload.funnel.report1?.ratePct) || 0,
        introToPurchase: Number(payload.funnel.report2?.ratePct) || 0,
      }
    }
    const rows = [
      point(comparisons?.lastYear, 'Same window last year'),
      point(comparisons?.previous, 'Prior period'),
      point(data, 'Current period'),
    ].filter(Boolean)
    return rows.length >= 2 ? rows : null
  }, [data, comparisons])

  const firstPurchase = journey[0]
  const selectedJourney = journey[journeyIndex]
  const selectedTier = progression[tierIndex]

  return (
    <section id="od-conversions" className="mt-24 scroll-mt-32">
      <SectionHead
        number="06"
        title="Conversion"
        emphasis="Funnel Report"
        tag="Q2–Q4 · ACQUIRE → CONVERT → ADVANCE"
        subtitle="Four reports, one story — from a stranger's first enquiry through to the top curriculum tier."
      />

      <Reveal delay={1}>
        <Panel>
          <PanelHead title="Conversion Trends" note="this window vs prior period vs last year" />
          {trend ? (
            <>
              <div className="mt-3">
                <Legend items={TREND_SERIES.map((s) => ({ label: s.label, color: s.color }))} />
              </div>
              <div className="mt-2">
                <MultiLine data={trend} xKey="label" series={TREND_SERIES} height={250} />
              </div>
              <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground">
                Three comparable points, not a rolling 12-month line — a monthly rate history would need a dedicated
                time-series endpoint rather than twelve separate overview reads.
              </p>
            </>
          ) : (
            <Empty message="Not enough comparison data to plot a rate trend yet." height={200} />
          )}
        </Panel>
      </Reveal>

      {/* ── Report 1 ─────────────────────────────────────────────────────── */}
      <Report
        eyebrow="Report 1"
        title="Lead → Intro"
        emphasis="Booked"
        note="Measures whether a lead went on to book an introductory lesson, and how long that took."
        detailsButton={
          <DetailsButton
            title="Lead → Intro → First Purchase — full details"
            metric="conversionFunnelReports"
            rangeDays={rangeDays}
            columns={FUNNEL_COLUMNS}
          />
        }
      >
        {report1 ? (
          <Flow stages={2}>
            <Stage
              label="Leads"
              value={num(report1.leadCount)}
              metrics={[
                { label: 'Booked an intro', value: num(report1.introBookedCount) },
                {
                  label: 'Not booked',
                  value: num(Math.max(report1.leadCount - report1.introBookedCount, 0)),
                },
              ]}
            />
            <Connector
              rate={`${report1.ratePct}%`}
              caption={`${num(report1.introBookedCount)} of ${num(report1.leadCount)} booked`}
              owner="MARKETING / FRONT DESK"
            />
            <Stage
              primary
              label="Intros Booked"
              value={num(report1.introBookedCount)}
              metrics={[{ label: 'Avg time to booking', value: `${report1.avgDaysToBook} days` }]}
            />
          </Flow>
        ) : (
          <Empty message="Funnel data is not visible to your role." height={160} />
        )}
      </Report>

      {/* ── Report 2 ─────────────────────────────────────────────────────── */}
      <Report
        eyebrow="Report 2"
        title="Intro → First"
        emphasis="Purchase"
        note="Every first purchase counts, whatever the product. Sale values describe that first sale only."
        detailsButton={
          <DetailsButton
            title="Lead → Intro → First Purchase — full details"
            metric="conversionFunnelReports"
            rangeDays={rangeDays}
            columns={FUNNEL_COLUMNS}
          />
        }
      >
        {report2 ? (
          <>
            <Flow stages={2}>
              <Stage
                label="Intros Taught"
                value={num(report2.introCount)}
                metrics={
                  report1
                    ? [
                        { label: 'Booked', value: num(report1.introBookedCount) },
                        { label: 'Show rate', value: `${report1.showRatePct}%` },
                      ]
                    : []
                }
              />
              <Connector
                rate={`${report2.ratePct}%`}
                caption={`${num(report2.firstPurchaseCount)} became buyers`}
                owner="INSTRUCTORS"
              />
              <Stage
                primary
                label="First Purchase"
                value={num(report2.firstPurchaseCount)}
                metrics={[
                  { label: 'Avg time to buy', value: `${report2.avgDaysToPurchase} days` },
                  ...(firstPurchase
                    ? [
                        { label: 'Avg 1st sale · lifetime', value: money(firstPurchase.avgSaleValue) },
                        {
                          label: 'Avg cash at sale · lifetime',
                          value: money(firstPurchase.avgCollected),
                          tone: 'text-[var(--studio-primary)]',
                        },
                        {
                          label: 'Collection rate · lifetime',
                          value: firstPurchase.avgSaleValue
                            ? pctOf(firstPurchase.avgCollected, firstPurchase.avgSaleValue)
                            : '0%',
                          tone: 'text-success',
                        },
                      ]
                    : []),
                ]}
              />
            </Flow>
            {report2.firstPurchaseProductMix?.length ? (
              <MixBars
                title="First Purchase · Product Mix"
                caption={`${num(report2.firstPurchaseCount)} customers`}
                rows={report2.firstPurchaseProductMix.map((m) => ({
                  label: m.category,
                  pct: m.pct,
                  value: `${num(m.count)} \u00b7 ${m.pct}%`,
                  color: PRODUCT_MIX_COLORS[m.category],
                }))}
              />
            ) : (
              <Empty message="No first purchases in this period." height={80} />
            )}
            <Caveat>
              Counts are window-scoped, but the figures marked <em>lifetime</em> average every customer&apos;s first
              purchase across all time — first-sale values are not aggregated per window, so a window with no
              conversions still carries a lifetime average.
            </Caveat>
          </>
        ) : (
          <Empty message="Funnel data is not visible to your role." height={160} />
        )}
      </Report>

      {/* ── Report 3 ─────────────────────────────────────────────────────── */}
      <Report
        eyebrow="Report 3"
        title="Purchase"
        emphasis="Journey"
        note="Each enrolment or membership is one billing unit — instalments stay attached to the original purchase and never create another milestone."
        detailsButton={
          <DetailsButton
            title="Purchase Journey — full details"
            metric="purchaseJourney"
            rangeDays={rangeDays}
            columns={JOURNEY_COLUMNS}
          />
        }
      >
        {journey.length ? (
          <>
            <Flow stages={journey.length}>
              {journey.map((s, i) => (
                <Fragment key={s.label}>
                  {i > 0 && (
                    <Connector
                      rate={pctOf(s.count, journey[i - 1].count)}
                      caption={
                        s.avgDaysSincePrevious !== null
                          ? `${num(s.count)} bought again · avg ${s.avgDaysSincePrevious}d later`
                          : `${num(s.count)} bought again`
                      }
                    />
                  )}
                  <Stage
                    label={s.label}
                    value={num(s.count)}
                    primary={i === 0}
                    selected={i === journeyIndex}
                    onClick={() => setJourneyIndex(i)}
                    footer="VIEW DETAILS ▸"
                    metrics={[
                      { label: 'Avg sale', value: money(s.avgSaleValue) },
                      { label: 'Avg cash at sale', value: money(s.avgCollected), tone: 'text-[var(--studio-primary)]' },
                      {
                        label: 'Collection rate',
                        value: s.avgSaleValue ? pctOf(s.avgCollected, s.avgSaleValue) : '0%',
                        tone: 'text-success',
                      },
                      { label: 'Avg LTV', value: money(s.avgLtv) },
                    ]}
                  />
                </Fragment>
              ))}
            </Flow>
            {selectedJourney && (
              <MixBars
                title={`${selectedJourney.label} · Cash Mix at Sale`}
                caption={`${num(selectedJourney.count)} customers`}
                rows={[
                  {
                    label: 'Collected up front',
                    pct: selectedJourney.avgSaleValue
                      ? Math.round((selectedJourney.avgCollected / selectedJourney.avgSaleValue) * 100)
                      : 0,
                    value: money(selectedJourney.avgCollected),
                    color: 'var(--studio-primary)',
                  },
                  {
                    label: 'Financed / outstanding',
                    pct: selectedJourney.avgSaleValue
                      ? Math.max(
                          100 - Math.round((selectedJourney.avgCollected / selectedJourney.avgSaleValue) * 100),
                          0
                        )
                      : 0,
                    value: money(Math.max(selectedJourney.avgSaleValue - selectedJourney.avgCollected, 0)),
                    color: 'color-mix(in srgb, var(--studio-primary) 30%, transparent)',
                  },
                ]}
              />
            )}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 border-t border-border pt-3 text-[10.5px] text-muted-foreground">
              <span>
                <b className="text-[var(--studio-primary)]">Milestones:</b> Purchase 1–5, then grouped
              </span>
              <span>
                <b className="text-[var(--studio-primary)]">LTV:</b> all net sales through that milestone
              </span>
            </div>
          </>
        ) : (
          <Empty message="No purchases in this period." height={160} />
        )}
      </Report>

      {/* ── Report 4 ─────────────────────────────────────────────────────── */}
      <Report
        eyebrow="Report 4"
        title="Classic Curriculum"
        emphasis="Funnel"
        note="Counts students who have ever reached each tier, ordered by the curriculum's own sequence."
        detailsButton={
          <DetailsButton
            title="Curriculum Progression — full details"
            metric="curriculumProgression"
            rangeDays={rangeDays}
            columns={PROGRESSION_COLUMNS}
          />
        }
      >
        {progression.some((s) => s.count > 0) ? (
          <>
            <Flow stages={progression.length}>
              {progression.map((s, i) => (
                <Fragment key={s.label}>
                  {i > 0 && <Connector rate={pctOf(s.count, progression[i - 1].count)} caption="advanced" />}
                  <Stage
                    label={s.label}
                    value={num(s.count)}
                    primary={i === 0}
                    selected={i === tierIndex}
                    onClick={() => setTierIndex(i)}
                    footer="VIEW DETAILS ▸"
                    metrics={[
                      { label: 'Revenue in window', value: moneyShort(revenueByTier.get(s.label) || 0) },
                      { label: 'Lessons in window', value: num(lessonsByTier.get(s.label) || 0) },
                    ]}
                  />
                </Fragment>
              ))}
            </Flow>
            {selectedTier && (
              <MixBars
                title={`${selectedTier.label} · Share of Students Reaching This Tier`}
                caption={`${num(selectedTier.count)} of ${num(progression[0]?.count || 0)} who started`}
                rows={[
                  {
                    label: 'Reached this tier',
                    pct: progression[0]?.count
                      ? Math.round((selectedTier.count / progression[0].count) * 100)
                      : 0,
                    value: num(selectedTier.count),
                    color: 'var(--studio-primary)',
                  },
                  {
                    label: 'Stopped before it',
                    pct: progression[0]?.count
                      ? Math.max(100 - Math.round((selectedTier.count / progression[0].count) * 100), 0)
                      : 0,
                    value: num(Math.max((progression[0]?.count || 0) - selectedTier.count, 0)),
                    color: 'color-mix(in srgb, hsl(var(--destructive)) 35%, transparent)',
                  },
                ]}
              />
            )}
            <p className="mt-4 border-t border-border pt-3 text-[10.5px] leading-relaxed text-muted-foreground">
              Tier counts are lifetime, not window-scoped, so they are not divided by the intros taught in the selected
              range. Revenue and lessons on each card <em>are</em> window-scoped.
            </p>
          </>
        ) : (
          <NotAvailable
            message="No students have reached a curriculum tier yet."
            requires="Tiers come from active curricula in Settings, matched to purchased packages."
            height={180}
          />
        )}
      </Report>
    </section>
  )
}
