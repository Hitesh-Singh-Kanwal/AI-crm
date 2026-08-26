'use client'

import { useMemo } from 'react'
import DetailsButton from '@/components/owner-dashboard/widgets/DetailsButton'
import { Caveat, Dash, Empty, NotAvailable, Panel, PanelHead, Reveal, SectionHead, moneyShort, num } from '../chrome'
import { Cell, DataTable, RankedBars, RevenueLessonsCombo, Row } from '../viz'

const FORECAST_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'studio', label: 'Studio' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'title', label: 'Lesson' },
]

/**
 * The combo chart's revenue bars come from the classic overview's 12-month
 * history. There is no matching monthly lesson series — `lessons.trend` is
 * week-buckets inside the selected window only — so the line is left off and
 * the panel says so rather than inventing a second axis from nothing.
 */
function buildCombo(monthly) {
  if (!monthly?.length) return null
  const lastReal = monthly.reduce((last, row, i) => (Number(row.thisYear) ? i : last), -1)
  const trimmed = lastReal >= 0 ? monthly.slice(0, lastReal + 1) : monthly
  return trimmed.map((row) => ({ label: row.month, revenue: Math.round(Number(row.thisYear) || 0), lessons: 0 }))
}

export default function ForecastSection({ data, classic, rangeDays }) {
  const lessons = data?.lessons
  const forecast = useMemo(
    () => [...(lessons?.forecastByStudio || [])].sort((a, b) => b.scheduled - a.scheduled),
    [lessons]
  )
  const combo = useMemo(() => buildCombo(classic?.aiAgentRevenue), [classic])
  const forecastByTeacher = lessons?.forecastByTeacher || []
  const totalScheduled = forecast.reduce((s, r) => s + (Number(r.scheduled) || 0), 0)

  return (
    <section id="od-forecast" className="mt-24 scroll-mt-32">
      <SectionHead
        number="04"
        title="Lesson"
        emphasis="Forecast"
        tag="Q1 · WHAT WILL WE TEACH NEXT?"
        subtitle="Scheduled lessons sit beside taught lessons, so volume, staffing and capacity get acted on together."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Reveal delay={1}>
          <Panel className="h-full">
            <PanelHead
              title="Scheduled by Studio"
              note="confirmed future lessons only"
              detailsButton={
                <DetailsButton
                  title="Scheduled Lessons Forecast — full details"
                  metric="lessonForecast"
                  rangeDays={rangeDays}
                  columns={FORECAST_COLUMNS}
                />
              }
            />
            {forecast.length ? (
              <>
                <p className="od-figure mt-3 text-[38px] leading-none text-[var(--studio-primary)]">
                  {num(totalScheduled)}
                </p>
                <p className="mb-3 mt-1 text-[11px] text-muted-foreground">lessons on the books across the network</p>
                <RankedBars rows={forecast.map((r) => ({ label: r.location, value: r.scheduled }))} />
              </>
            ) : (
              <Empty message="No upcoming lessons scheduled." height={220} />
            )}
          </Panel>
        </Reveal>

        <Reveal delay={2}>
          <Panel className="h-full">
            <PanelHead title="Scheduled by Instructor" note="forecast & usable capacity" />
            <DataTable
              head={['Instructor', 'Studio', 'Scheduled', 'Capacity', 'Remaining/wk', 'Projected']}
              minWidth={620}
              emptyMessage={forecastByTeacher.length ? undefined : 'No instructors with a weekly capacity configured.'}
            >
              {forecastByTeacher.map((t) => (
                <Row key={t.teacher}>
                  <Cell first>{t.teacher}</Cell>
                  <Cell>{t.studio || <Dash />}</Cell>
                  <Cell tone="text-[var(--studio-primary)] font-bold">{num(t.scheduled)}</Cell>
                  <Cell>{num(t.weeklyCapacity)}</Cell>
                  <Cell tone={t.remainingPerWeek > 0 ? 'text-success' : 'text-muted-foreground'}>
                    {t.remainingPerWeek}
                  </Cell>
                  <Cell
                    tone={
                      t.projectedUtilizationPct >= 90
                        ? 'text-destructive font-bold'
                        : t.projectedUtilizationPct >= 75
                          ? 'text-warning'
                          : 'text-success'
                    }
                  >
                    {t.projectedUtilizationPct}%
                  </Cell>
                </Row>
              ))}
            </DataTable>
            <Caveat>
              Scheduled is every future lesson already on this instructor&apos;s calendar, not bounded to the next 7
              days. Remaining/wk and Projected extrapolate from their recent weekly pace, not from the schedule itself —
              there is no lessons-per-future-week series to derive a true forecast from.
            </Caveat>
          </Panel>
        </Reveal>
      </div>

      <Reveal className="mt-4">
        <Panel>
          <PanelHead title="Revenue & Lessons Trend" note="last 12 months · bars = revenue" />
          {combo ? (
            <>
              <div className="mt-3">
                <RevenueLessonsCombo data={combo} height={290} moneyFormatter={moneyShort} />
              </div>
              <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground">
                The lessons line is off: lesson counts are only bucketed by week inside the selected window, so there is
                no 12-month lesson history to plot against revenue.
              </p>
            </>
          ) : (
            <NotAvailable
              message="Revenue history is not visible to your role."
              requires="The 12-month series comes from the classic dashboard overview, which needs the AI Analytics dashboard permission."
              height={250}
            />
          )}
        </Panel>
      </Reveal>
    </section>
  )
}
