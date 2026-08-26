'use client'

import { useMemo } from 'react'
import DetailsButton from '@/components/owner-dashboard/widgets/DetailsButton'
import { Empty, Legend, NotAvailable, Panel, PanelHead, Reveal, SectionHead, num } from '../chrome'
import { Cell, DataTable, GoalBar, Row, StackedCompare } from '../viz'

const STUDENT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'studio', label: 'Studio' },
  { key: 'booked', label: 'Booked' },
]

const GOAL_COLUMNS = [
  { key: 'category', label: 'Category' },
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'label', label: 'Detail' },
  { key: 'name', label: 'Name' },
  { key: 'studio', label: 'Studio' },
  { key: 'value', label: 'Value', format: (v) => num(v) },
]

const BOOKED_COLOR = 'var(--studio-primary)'
const NOT_BOOKED_COLOR = 'color-mix(in srgb, hsl(var(--destructive)) 38%, transparent)'

/** Engagement rate per studio from a comparison payload, keyed by studio name. */
function engagementIndex(payload) {
  if (!payload?.studentHealth) return null
  return new Map(
    (payload.studentHealth.perStudio || []).map((r) => [r.location, Number(r.avgLessonsPerActiveStudentPerWeek) || 0])
  )
}

function GrowthCell({ current, index }) {
  if (!index) return <Cell tone="text-muted-foreground">&mdash;</Cell>
  const prev = index.get(current.location)
  if (prev === undefined || prev === 0) return <Cell tone="text-muted-foreground">&mdash;</Cell>
  const value = ((Number(current.avgLessonsPerActiveStudentPerWeek) - prev) / prev) * 100
  const up = value >= 0
  return (
    <Cell tone={`${up ? 'text-success' : 'text-destructive'} font-bold`}>
      {up ? '+' : ''}
      {value.toFixed(1)}%
    </Cell>
  )
}

export default function StudentHealthSection({ data, comparisons, rangeDays }) {
  const health = data?.studentHealth
  const totals = health?.totals
  const perStudio = useMemo(
    () => [...(health?.perStudio || [])].sort((a, b) => b.active - a.active),
    [health]
  )

  const prevIndex = useMemo(() => engagementIndex(comparisons?.previous), [comparisons])
  const lyIndex = useMemo(() => engagementIndex(comparisons?.lastYear), [comparisons])

  const newStudentGoal = (data?.goals?.metrics || []).find((m) => m.metric === 'newActiveStudents')

  return (
    <section id="od-health" className="mt-24 scroll-mt-32">
      <SectionHead
        number="08"
        title="Student"
        emphasis="Health"
        tag="Q5 · ARE STUDENTS ENGAGED?"
        subtitle="The strongest early warning of churn — before it shows up in revenue."
      />

      <Reveal delay={1}>
        <Panel>
          <PanelHead
            title="Active Students: Booked vs Not Booked"
            note={
              totals
                ? `${num(totals.booked)} booked + ${num(totals.notBooked)} not booked = ${num(totals.active)} active`
                : null
            }
            detailsButton={
              <DetailsButton
                title="Active Students — full details"
                metric="studentHealth"
                rangeDays={rangeDays}
                columns={STUDENT_COLUMNS}
              />
            }
          />
          {perStudio.length ? (
            <>
              <div className="mt-3">
                <Legend
                  items={[
                    { label: 'Booked', color: BOOKED_COLOR },
                    { label: 'Not booked', color: NOT_BOOKED_COLOR },
                  ]}
                />
              </div>
              <div className="mt-3">
                <StackedCompare
                  aColor={BOOKED_COLOR}
                  bColor={NOT_BOOKED_COLOR}
                  rows={perStudio.map((r) => ({
                    label: r.location,
                    sublabel: `${num(r.booked)} of ${num(r.active)} booked`,
                    a: r.booked,
                    b: r.notBooked,
                    valueLabel: `${r.bookedPct}%`,
                    valueTone:
                      r.bookedPct >= 80
                        ? 'text-success'
                        : r.bookedPct >= 65
                          ? 'text-warning'
                          : 'text-destructive',
                  }))}
                />
              </div>
            </>
          ) : (
            <Empty message="No active students in this period." height={200} />
          )}
        </Panel>
      </Reveal>

      <Reveal className="mt-4">
        <Panel>
          <PanelHead
            title="Lessons per Active Student"
            note="weekly pace & month-to-date engagement"
            detailsButton={
              <DetailsButton
                title="Active Students — full details"
                metric="studentHealth"
                rangeDays={rangeDays}
                columns={STUDENT_COLUMNS}
              />
            }
          />
          {perStudio.length ? (
            <DataTable head={['Studio', 'Avg / Week', 'Avg MTD', 'MoM Growth', 'YoY Growth']} minWidth={560}>
              {perStudio.map((r, i) => (
                <Row key={r.location}>
                  <Cell first tone={i === 0 ? 'text-[var(--studio-primary)]' : 'text-foreground'}>
                    {r.location}
                  </Cell>
                  <Cell tone="text-[var(--studio-primary)] font-bold">
                    {Number(r.avgLessonsPerActiveStudentPerWeek).toFixed(1)}
                  </Cell>
                  <Cell>{Number(r.avgLessonsMTD).toFixed(1)}</Cell>
                  <GrowthCell current={r} index={prevIndex} />
                  <GrowthCell current={r} index={lyIndex} />
                </Row>
              ))}
            </DataTable>
          ) : (
            <Empty message="No active students in this period." height={160} />
          )}
        </Panel>
      </Reveal>

      <Reveal className="mt-4">
        <Panel>
          <PanelHead
            title="New Active Students vs Goal"
            note={data?.goals?.period ? `organisation-wide · ${data.goals.period}` : 'organisation-wide'}
            detailsButton={
              <DetailsButton
                title="Goals This Month — full details"
                metric="goalsDetail"
                rangeDays={rangeDays}
                columns={GOAL_COLUMNS}
              />
            }
          />
          {newStudentGoal ? (
            <div className="mt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="od-figure text-[34px] leading-none text-[var(--studio-primary)]">
                  {num(newStudentGoal.actual)}
                </span>
                <span className="text-[12px] tabular-nums text-muted-foreground">
                  {newStudentGoal.target !== null ? (
                    <>
                      of {num(newStudentGoal.target)} target ·{' '}
                      <b
                        className={
                          newStudentGoal.pct >= 100
                            ? 'text-success'
                            : newStudentGoal.pct >= 85
                              ? 'text-warning'
                              : 'text-destructive'
                        }
                      >
                        {newStudentGoal.pct}%
                      </b>
                    </>
                  ) : (
                    'no new-student target set for this month'
                  )}
                </span>
              </div>
              {newStudentGoal.target !== null && (
                <div className="mt-3">
                  <GoalBar pct={newStudentGoal.pct} />
                </div>
              )}
            </div>
          ) : (
            <NotAvailable
              message="No new-student goal configured for this month."
              requires="Set a new active students target in Settings → Goals."
              height={140}
            />
          )}
        </Panel>
      </Reveal>
    </section>
  )
}
