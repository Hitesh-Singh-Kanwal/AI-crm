'use client'

import { useMemo } from 'react'
import DonutChart from '@/components/dashboard/widgets/DonutChart'
import DetailsButton from '@/components/owner-dashboard/widgets/DetailsButton'
import { Caveat, Dash, Empty, NotAvailable, Panel, PanelHead, Reveal, SectionHead, num } from '../chrome'
import { Cell, DataTable, DrillAccordion, GoalBar, RankedBars, Row, TrendArea } from '../viz'

const LESSON_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'studio', label: 'Studio' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'title', label: 'Lesson' },
  { key: 'status', label: 'Status' },
]

const TEACHER_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'teacher', label: 'Teacher' },
  { key: 'studio', label: 'Studio' },
  { key: 'title', label: 'Lesson' },
  { key: 'status', label: 'Status' },
]

const CURRICULUM_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'studio', label: 'Studio' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'tier', label: 'Curriculum Tier' },
  { key: 'title', label: 'Lesson' },
]

const GOAL_COLUMNS = [
  { key: 'category', label: 'Category' },
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'label', label: 'Detail' },
  { key: 'name', label: 'Name' },
  { key: 'studio', label: 'Studio' },
  { key: 'value', label: 'Value', format: (v) => num(v) },
]

/** Index a `[{ [key]: name, [valueKey]: n }]` list by its name column. */
function indexBy(rows, key, valueKey) {
  return new Map((rows || []).map((r) => [r[key], Number(r[valueKey]) || 0]))
}

/**
 * Growth for one row against a comparison window. Returns `null` — rendered as
 * an em dash — when the comparison payload is still loading or the row did not
 * exist back then, so a brand-new studio never reads as "-100%".
 */
function growth(current, previousMap) {
  if (!previousMap) return null
  const prev = previousMap.get(current.name)
  if (prev === undefined || prev === 0) return null
  return ((current.value - prev) / prev) * 100
}

function GrowthCell({ value }) {
  if (value === null) return <Cell tone="text-muted-foreground">&mdash;</Cell>
  const up = value >= 0
  return (
    <Cell tone={`${up ? 'text-success' : 'text-destructive'} font-bold`}>
      {up ? '+' : ''}
      {value.toFixed(1)}%
    </Cell>
  )
}

function growthLabel(value, label) {
  if (value === null) return null
  const up = value >= 0
  return (
    <span className={up ? 'text-success' : 'text-destructive'}>
      {label} {up ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  )
}

export default function LessonsSection({ data, comparisons, rangeDays }) {
  const lessons = data?.lessons
  const goals = data?.goals

  const prevByStudio = useMemo(
    () => (comparisons?.previous?.lessons ? indexBy(comparisons.previous.lessons.byStudio, 'location', 'count') : null),
    [comparisons]
  )
  const lyByStudio = useMemo(
    () => (comparisons?.lastYear?.lessons ? indexBy(comparisons.lastYear.lessons.byStudio, 'location', 'count') : null),
    [comparisons]
  )
  const prevByTeacher = useMemo(
    () => (comparisons?.previous?.lessons ? indexBy(comparisons.previous.lessons.byTeacher, 'teacher', 'count') : null),
    [comparisons]
  )
  const lyByTeacher = useMemo(
    () => (comparisons?.lastYear?.lessons ? indexBy(comparisons.lastYear.lessons.byTeacher, 'teacher', 'count') : null),
    [comparisons]
  )

  const byStudio = useMemo(
    () =>
      [...(lessons?.byStudio || [])]
        .sort((a, b) => b.count - a.count)
        .map((r) => ({ name: r.location, value: r.count })),
    [lessons]
  )

  const byTeacher = useMemo(
    () =>
      [...(lessons?.byTeacher || [])]
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map((r) => ({ name: r.teacher, studio: r.studio, value: r.count })),
    [lessons]
  )

  const mix = useMemo(() => (lessons?.byCurriculum || []).filter((r) => Number(r.count) > 0), [lessons])
  const mixTotal = mix.reduce((s, r) => s + Number(r.count), 0)
  const lessonsGoal = (goals?.metrics || []).find((m) => m.metric === 'lessons')
  const lessonsGoalsPerStudio = goals?.perStudio || []

  return (
    <section id="od-lessons" className="mt-24 scroll-mt-32">
      <SectionHead
        number="03"
        title="Lessons — the"
        emphasis="Teaching Engine"
        tag="Q1 · ARE WE GROWING?"
        subtitle="Is teaching volume growing, what exactly are we teaching — and who is teaching it?"
      />

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Reveal delay={1}>
          <Panel className="h-full">
            <PanelHead
              title="Lessons Taught by Studio"
              note="vs prior period & last year"
              detailsButton={
                <DetailsButton
                  title="Lessons by Studio — full details"
                  metric="lessonsByStudio"
                  rangeDays={rangeDays}
                  columns={LESSON_COLUMNS}
                />
              }
            />
            {byStudio.length ? (
              <div className="mt-4">
                <RankedBars
                  labelWidth={172}
                  rows={byStudio.map((r) => {
                    const mom = growthLabel(growth(r, prevByStudio), 'MoM')
                    const yoy = growthLabel(growth(r, lyByStudio), 'YoY')
                    return {
                      label: r.name,
                      value: r.value,
                      sublabel:
                        mom || yoy ? (
                          <>
                            {mom}
                            {mom && yoy ? ' · ' : ''}
                            {yoy}
                          </>
                        ) : null,
                    }
                  })}
                />
              </div>
            ) : (
              <Empty message="No completed lessons in this period." height={200} />
            )}
          </Panel>
        </Reveal>

        <div className="flex flex-col gap-4">
          <Reveal delay={2}>
            <Panel>
              <PanelHead
                title="Lesson Mix"
                note="by curriculum tier"
                detailsButton={
                  <DetailsButton
                    title="Lessons by Curriculum Tier — full details"
                    metric="lessonsByCurriculum"
                    rangeDays={rangeDays}
                    columns={CURRICULUM_COLUMNS}
                  />
                }
              />
              {mix.length ? (
                <>
                  <div className="mt-4">
                    <DonutChart
                      data={mix.map((r) => ({ name: r.tier, value: r.count }))}
                      centerLabel="Tagged lessons"
                      centerValue={num(mixTotal)}
                      height={180}
                      valueFormatter={(v) => `${num(v)} lessons`}
                      showLegend={false}
                    />
                  </div>
                  <DrillAccordion
                    items={[
                      {
                        label: 'Curriculum tiers',
                        value: `${num(mixTotal)} lessons`,
                        rows: mix.map((r) => ({ label: r.tier, value: num(r.count) })),
                      },
                    ]}
                  />
                  <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
                    Only curriculum-tagged lessons appear. Intros, group classes and coaching carry no tier.
                  </p>
                </>
              ) : (
                <Empty message="No curriculum-tagged lessons in this period." height={200} />
              )}
            </Panel>
          </Reveal>

          <Reveal delay={2}>
            <Panel>
              <PanelHead
                title="Lessons Trend"
                note="by week"
                detailsButton={
                  <DetailsButton
                    title="Lessons Trend — full details"
                    metric="lessonTrend"
                    rangeDays={rangeDays}
                    columns={LESSON_COLUMNS}
                  />
                }
              />
              {lessons?.trend?.length ? (
                <div className="mt-3">
                  <TrendArea
                    data={lessons.trend}
                    xKey="week"
                    yKey="count"
                    height={150}
                    seriesName="Lessons"
                    gradientId="odLessonTrend"
                  />
                </div>
              ) : (
                <Empty message="No completed lessons in this period." height={150} />
              )}
            </Panel>
          </Reveal>
        </div>
      </div>

      <Reveal className="mt-4">
        <Panel>
          <PanelHead
            title="Lessons Taught by Teacher"
            note="top 10 · period growth & annual growth"
            detailsButton={
              <DetailsButton
                title="Lessons by Teacher — full details"
                metric="lessonsByTeacher"
                rangeDays={rangeDays}
                columns={TEACHER_COLUMNS}
              />
            }
          />
          {byTeacher.length ? (
            <>
              <DataTable
                head={['Teacher', 'Studio', 'Lessons Taught', 'Period Growth', 'Annual Growth']}
                minWidth={620}
              >
                {byTeacher.map((r, i) => (
                  <Row key={r.name}>
                    <Cell first tone={i === 0 ? 'text-[var(--studio-primary)]' : 'text-foreground'}>
                      {r.name}
                    </Cell>
                    <Cell>{r.studio || <Dash />}</Cell>
                    <Cell tone="text-[var(--studio-primary)] font-bold">{num(r.value)}</Cell>
                    <GrowthCell value={growth(r, prevByTeacher)} />
                    <GrowthCell value={growth(r, lyByTeacher)} />
                  </Row>
                ))}
              </DataTable>
              <Caveat>
                Growth compares this teacher against the prior period and the same window last year.
              </Caveat>
            </>
          ) : (
            <Empty message="No completed lessons in this period." height={160} />
          )}
        </Panel>
      </Reveal>

      <Reveal className="mt-4">
        <Panel>
          <PanelHead
            title="Lessons vs Goal"
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
          {lessonsGoalsPerStudio.length || lessonsGoal ? (
            <>
              <DataTable head={['Studio', 'Lessons MTD', 'Goal', 'Attainment', { label: '', width: 130 }]} minWidth={620}>
                {lessonsGoalsPerStudio.map((g) => (
                  <Row key={g.location}>
                    <Cell first>{g.location}</Cell>
                    <Cell tone="text-[var(--studio-primary)] font-bold">{num(g.lessonsActual)}</Cell>
                    <Cell>{g.lessonsTarget !== null ? num(g.lessonsTarget) : <Dash />}</Cell>
                    <Cell
                      tone={
                        g.lessonsPct === null
                          ? 'text-muted-foreground'
                          : g.lessonsPct >= 100
                            ? 'text-success font-bold'
                            : g.lessonsPct >= 85
                              ? 'text-warning font-bold'
                              : 'text-destructive font-bold'
                      }
                    >
                      {g.lessonsPct !== null ? `${g.lessonsPct}%` : <Dash />}
                    </Cell>
                    <Cell>{g.lessonsPct !== null ? <GoalBar pct={g.lessonsPct} /> : null}</Cell>
                  </Row>
                ))}
                {lessonsGoal && (
                  <Row>
                    <Cell first tone="text-foreground">
                      Organisation
                    </Cell>
                    <Cell tone="text-[var(--studio-primary)] font-bold">{num(lessonsGoal.actual)}</Cell>
                    <Cell>{lessonsGoal.target !== null ? num(lessonsGoal.target) : <Dash />}</Cell>
                    <Cell
                      tone={
                        lessonsGoal.pct === null
                          ? 'text-muted-foreground'
                          : lessonsGoal.pct >= 100
                            ? 'text-success font-bold'
                            : lessonsGoal.pct >= 85
                              ? 'text-warning font-bold'
                              : 'text-destructive font-bold'
                      }
                    >
                      {lessonsGoal.pct !== null ? `${lessonsGoal.pct}%` : <Dash />}
                    </Cell>
                    <Cell>{lessonsGoal.pct !== null ? <GoalBar pct={lessonsGoal.pct} /> : null}</Cell>
                  </Row>
                )}
              </DataTable>
              <Caveat>
                Every row is month-to-date. A studio row with a dash for Goal has no lesson target set for this studio in
                Settings &rarr; Goals yet.
              </Caveat>
            </>
          ) : (
            <NotAvailable
              message="No lesson goal configured for this month."
              requires="Set a lessons target in Settings → Goals to track pace here."
              height={150}
            />
          )}
        </Panel>
      </Reveal>
    </section>
  )
}
