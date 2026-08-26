'use client'

import { useMemo, useState } from 'react'
import DonutChart from '@/components/dashboard/widgets/DonutChart'
import DetailsButton from '@/components/owner-dashboard/widgets/DetailsButton'
import { Caveat, Dash, Empty, NotAvailable, Panel, PanelHead, Reveal, SectionHead, Segmented, money, moneyShort, num } from '../chrome'
import { Cell, DataTable, DrillAccordion, GoalBar, MixBars, RankedBars, Row, TrendArea } from '../viz'

const MONEY_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'customer', label: 'Customer' },
  { key: 'studio', label: 'Studio' },
  { key: 'type', label: 'Type' },
  { key: 'method', label: 'Method' },
  { key: 'amount', label: 'Amount', format: moneyShort },
]

const BALANCE_COLUMNS = [
  { key: 'customer', label: 'Customer' },
  { key: 'studio', label: 'Studio' },
  { key: 'source', label: 'Source' },
  { key: 'name', label: 'Package / Membership' },
  { key: 'dueAmount', label: 'Due', format: moneyShort },
]

const CURRICULUM_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'customer', label: 'Customer' },
  { key: 'studio', label: 'Studio' },
  { key: 'tier', label: 'Curriculum Tier' },
  { key: 'amount', label: 'Amount', format: moneyShort },
]

const GOAL_COLUMNS = [
  { key: 'category', label: 'Category' },
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'label', label: 'Detail' },
  { key: 'name', label: 'Name' },
  { key: 'studio', label: 'Studio' },
  { key: 'value', label: 'Value', format: (v, row) => (row?.category === 'Revenue' ? money(v) : num(v)) },
]

const TREND_OPTIONS = [
  { value: 'm', label: 'MONTHLY' },
  { value: 'q', label: 'QUARTERLY' },
  { value: 'y', label: 'YEARLY' },
]

/**
 * Rolls the classic overview's 12-month revenue history (this year + last year,
 * `aiAgentRevenue`) into the three grains the concept's toggle offers. Months
 * that have not happened yet come back as 0 from the backend, so the monthly
 * series is trimmed at the last month with any revenue on either year — an
 * untrimmed line would nose-dive to zero for the rest of the calendar.
 */
function buildTrendSeries(monthly) {
  if (!monthly?.length) return null

  const thisYear = new Date().getFullYear()
  const lastReal = monthly.reduce(
    (last, row, i) => (Number(row.thisYear) || Number(row.lastYear) ? i : last),
    -1
  )
  const trimmed = lastReal >= 0 ? monthly.slice(0, lastReal + 1) : monthly

  const m = trimmed.map((row) => ({ label: row.month, revenue: Math.round(Number(row.thisYear) || 0) }))

  const q = []
  for (const year of ['lastYear', 'thisYear']) {
    for (let quarter = 0; quarter < 4; quarter += 1) {
      const months = monthly.slice(quarter * 3, quarter * 3 + 3)
      const revenue = months.reduce((s, row) => s + (Number(row[year]) || 0), 0)
      const yearLabel = year === 'thisYear' ? thisYear : thisYear - 1
      // Skip a quarter that has not started yet rather than plotting a zero.
      if (year === 'thisYear' && !revenue && quarter * 3 > lastReal) continue
      q.push({ label: `Q${quarter + 1} ${String(yearLabel).slice(2)}`, revenue: Math.round(revenue) })
    }
  }

  const y = [
    { label: String(thisYear - 1), revenue: Math.round(monthly.reduce((s, r) => s + (Number(r.lastYear) || 0), 0)) },
    { label: String(thisYear), revenue: Math.round(monthly.reduce((s, r) => s + (Number(r.thisYear) || 0), 0)) },
  ]

  return { m, q, y }
}

/**
 * Product mix, assembled from the two product families the backend actually
 * prices separately: curriculum-tagged packages (`revenue.byCurriculum`) and
 * memberships (`revenue.membershipByType`). Ad-hoc products — competitions,
 * showcases, parties, drop-ins — carry no product dimension today, so this is
 * explicitly labelled as packages + memberships rather than "all revenue".
 */
function buildProductMix(revenue) {
  const tiers = (revenue?.byCurriculum || []).filter((r) => Number(r.revenue) > 0)
  const memberships = (revenue?.membershipByType || []).filter((r) => Number(r.revenue) > 0)
  const membershipTotal = memberships.reduce((s, r) => s + (Number(r.revenue) || 0), 0)

  const slices = [
    ...tiers.map((r) => ({ name: r.tier, value: Math.round(Number(r.revenue) || 0) })),
    ...(membershipTotal ? [{ name: 'Memberships', value: Math.round(membershipTotal) }] : []),
  ].sort((a, b) => b.value - a.value)

  const accordion = []
  if (tiers.length) {
    accordion.push({
      label: 'Curriculum packages',
      value: moneyShort(tiers.reduce((s, r) => s + Number(r.revenue), 0)),
      rows: tiers.map((r) => ({ label: r.tier, value: moneyShort(r.revenue) })),
    })
  }
  if (memberships.length) {
    accordion.push({
      label: 'Memberships',
      value: moneyShort(membershipTotal),
      rows: memberships.map((r) => ({ label: r.membershipName, value: moneyShort(r.revenue) })),
    })
  }

  return { slices, accordion, total: slices.reduce((s, r) => s + r.value, 0) }
}

export default function RevenueSection({ data, classic, rangeDays }) {
  const [grain, setGrain] = useState('m')

  const revenue = data?.revenue
  const goals = data?.goals
  const byStudio = useMemo(
    () => [...(revenue?.byStudio || [])].sort((a, b) => b.revenue - a.revenue),
    [revenue]
  )
  const ageing = revenue?.outstandingAgeing || []
  const ageingTotal = ageing.reduce((sum, b) => sum + b.amount, 0)
  const outstanding = useMemo(
    () => [...(revenue?.outstandingBalances || [])].sort((a, b) => b.outstanding - a.outstanding),
    [revenue]
  )
  const trend = useMemo(() => buildTrendSeries(classic?.aiAgentRevenue), [classic])
  const product = useMemo(() => buildProductMix(revenue), [revenue])

  const revenueGoal = (goals?.metrics || []).find((m) => m.metric === 'revenue')
  const revenueGoalsPerStudio = goals?.perStudio || []

  return (
    <section id="od-revenue" className="mt-24 scroll-mt-32">
      <SectionHead
        number="02"
        title="Where the"
        emphasis="Money"
        tag="Q7 · WHERE IS THE MONEY?"
        subtitle="Sources, mix and pace against plan — plus the cash still owed across the network."
      />

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-4">
          <Reveal delay={1}>
            <Panel>
              <PanelHead
                title="Revenue by Studio"
                note="net cash collected"
                detailsButton={
                  <DetailsButton
                    title="Revenue by Studio — full details"
                    metric="revenueByStudio"
                    rangeDays={rangeDays}
                    columns={MONEY_COLUMNS}
                  />
                }
              />
              {byStudio.length ? (
                <div className="mt-4">
                  <RankedBars
                    rows={byStudio.map((r) => ({ label: r.location, value: r.revenue }))}
                    valueFormatter={moneyShort}
                  />
                </div>
              ) : (
                <Empty message="No revenue in this period." height={160} />
              )}
            </Panel>
          </Reveal>

          <Reveal delay={1}>
            <Panel>
              <PanelHead
                title="Revenue Trend"
                right={<Segmented value={grain} onChange={setGrain} options={TREND_OPTIONS} />}
              />
              {trend ? (
                <div className="mt-3">
                  <TrendArea
                    data={trend[grain]}
                    xKey="label"
                    yKey="revenue"
                    height={195}
                    seriesName="Revenue"
                    valueFormatter={moneyShort}
                    gradientId="odRevenueTrend"
                  />
                </div>
              ) : (
                <NotAvailable
                  message="Revenue history is not visible to your role."
                  requires="The 12-month revenue series comes from the classic dashboard overview, which needs the AI Analytics dashboard permission."
                  height={180}
                />
              )}
            </Panel>
          </Reveal>
        </div>

        <Reveal delay={2}>
          <Panel className="h-full">
            <PanelHead
              title="Revenue by Product"
              note="packages + memberships"
              detailsButton={
                <DetailsButton
                  title="Revenue by Curriculum Tier — full details"
                  metric="revenueByCurriculum"
                  rangeDays={rangeDays}
                  columns={CURRICULUM_COLUMNS}
                />
              }
            />
            {product.slices.length ? (
              <>
                <div className="mt-4">
                  <DonutChart
                    data={product.slices}
                    centerLabel="Product revenue"
                    centerValue={moneyShort(product.total)}
                    height={190}
                    valueFormatter={(v) => moneyShort(v)}
                    showLegend={false}
                  />
                </div>
                <DrillAccordion items={product.accordion} />
                <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground">
                  Competitions, showcases, parties and drop-ins carry no product dimension yet, so they sit outside this
                  split.
                </p>
              </>
            ) : (
              <Empty message="No curriculum or membership revenue in this period." height={220} />
            )}
          </Panel>
        </Reveal>
      </div>

      <Reveal className="mt-4">
        <Panel>
          <PanelHead
            title="Revenue vs Goal"
            note={goals?.period ? `organisation-wide · ${goals.period}` : 'organisation-wide'}
            detailsButton={
              <DetailsButton
                title="Goals This Month — full details"
                metric="goalsDetail"
                rangeDays={rangeDays}
                columns={GOAL_COLUMNS}
              />
            }
          />
          {revenueGoalsPerStudio.length || revenueGoal ? (
            <>
              <DataTable
                head={['Studio', 'Revenue MTD', 'Goal', 'Attainment', { label: '', width: 130 }]}
                minWidth={620}
              >
                {revenueGoalsPerStudio.map((g) => (
                  <Row key={g.location}>
                    <Cell first>{g.location}</Cell>
                    <Cell tone="text-[var(--studio-primary)] font-bold">{moneyShort(g.revenueActual)}</Cell>
                    <Cell>{g.revenueTarget !== null ? moneyShort(g.revenueTarget) : <Dash />}</Cell>
                    <Cell
                      tone={
                        g.revenuePct === null
                          ? 'text-muted-foreground'
                          : g.revenuePct >= 100
                            ? 'text-success font-bold'
                            : g.revenuePct >= 85
                              ? 'text-warning font-bold'
                              : 'text-destructive font-bold'
                      }
                    >
                      {g.revenuePct !== null ? `${g.revenuePct}%` : <Dash />}
                    </Cell>
                    <Cell>{g.revenuePct !== null ? <GoalBar pct={g.revenuePct} /> : null}</Cell>
                  </Row>
                ))}
                {revenueGoal && (
                  <Row>
                    <Cell first tone="text-foreground">
                      Organisation
                    </Cell>
                    <Cell tone="text-[var(--studio-primary)] font-bold">{moneyShort(revenueGoal.actual)}</Cell>
                    <Cell>{revenueGoal.target !== null ? moneyShort(revenueGoal.target) : <Dash />}</Cell>
                    <Cell
                      tone={
                        revenueGoal.pct === null
                          ? 'text-muted-foreground'
                          : revenueGoal.pct >= 100
                            ? 'text-success font-bold'
                            : revenueGoal.pct >= 85
                              ? 'text-warning font-bold'
                              : 'text-destructive font-bold'
                      }
                    >
                      {revenueGoal.pct !== null ? `${revenueGoal.pct}%` : <Dash />}
                    </Cell>
                    <Cell>{revenueGoal.pct !== null ? <GoalBar pct={revenueGoal.pct} /> : null}</Cell>
                  </Row>
                )}
              </DataTable>
              <Caveat>
                Every row is month-to-date. A studio row with a dash for Goal has no target set for this studio in
                Settings &rarr; Goals yet &mdash; its revenue is still real, just not being measured against anything.
              </Caveat>
            </>
          ) : (
            <NotAvailable
              message="No goals configured for this month."
              requires="Set revenue, new-student and lesson targets in Settings → Goals to light this panel up."
              height={150}
            />
          )}
        </Panel>
      </Reveal>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Reveal delay={1}>
          <Panel className="h-full">
            <PanelHead
              title="Outstanding Balances"
              note="unpaid on active packages & memberships"
              detailsButton={
                <DetailsButton
                  title="Outstanding Balances — full details"
                  metric="outstandingBalances"
                  rangeDays={rangeDays}
                  columns={BALANCE_COLUMNS}
                />
              }
            />
            <p className="od-figure mt-3 text-[38px] leading-none text-[var(--studio-primary)]">
              {moneyShort(revenue?.totalOutstanding || 0)}
            </p>
            <p className="mb-3 mt-1 text-[11px] text-muted-foreground">
              across {num(outstanding.length)} {outstanding.length === 1 ? 'studio' : 'studios'}
            </p>
            {outstanding.length ? (
              <RankedBars
                rows={outstanding.map((r) => ({ label: r.location, value: r.outstanding }))}
                valueFormatter={moneyShort}
              />
            ) : (
              <Empty message="No outstanding balances." height={140} />
            )}
            {ageing.length ? (
              <MixBars
                title="Ageing"
                caption="by days outstanding"
                rows={ageing.map((b) => ({
                  label: b.bucket,
                  pct: ageingTotal ? Math.round((b.amount / ageingTotal) * 100) : 0,
                  value: moneyShort(b.amount),
                  color: b.bucket.startsWith('90+') ? 'hsl(var(--destructive))' : undefined,
                }))}
              />
            ) : (
              <Empty message="No outstanding balances to age." height={100} />
            )}
          </Panel>
        </Reveal>

        <Reveal delay={2}>
          <Panel className="h-full">
            <PanelHead title="Potential Revenue Opportunities" note="next 60 days" />
            <NotAvailable
              message="Opportunity scoring is not built yet."
              requires="Needs a rules engine that flags students ready for the next tier, renewals coming due, and lapsed bookings — then prices each next step. No endpoint produces this today."
              height={280}
            />
          </Panel>
        </Reveal>
      </div>
    </section>
  )
}
