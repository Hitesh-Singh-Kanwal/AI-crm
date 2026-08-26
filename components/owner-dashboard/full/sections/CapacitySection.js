'use client'

import { useMemo } from 'react'
import DetailsButton from '@/components/owner-dashboard/widgets/DetailsButton'
import { Caveat, Dash, Empty, NotAvailable, Panel, PanelHead, Reveal, SectionHead, num } from '../chrome'
import { CapacityMeter, Cell, DataTable, RankedBars, Row } from '../viz'

const UTILIZATION_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'teacher', label: 'Teacher' },
  { key: 'studio', label: 'Studio' },
  { key: 'title', label: 'Lesson' },
  { key: 'status', label: 'Status' },
]

export default function CapacitySection({ data, summaries, rangeDays }) {
  const all = data?.lessons?.instructorUtilization || []
  const configured = useMemo(() => all.filter((t) => t.weeklyCapacity > 0), [all])
  const unconfigured = all.length - configured.length

  const cur = summaries?.current
  const capacity = cur?.capacityPerWeek || 0
  const actual = cur?.actualPerWeek || 0
  const utilization = cur?.utilizationPct
  const spare = Math.max(capacity - actual, 0)

  return (
    <section id="od-capacity" className="mt-24 scroll-mt-32">
      <SectionHead
        number="05"
        title="Instructor"
        emphasis="Utilization"
        tag="Q6 · ARE WE FULLY UTILIZED?"
        subtitle="Do we have enough teaching capacity to absorb the growth we are buying?"
      />

      <Reveal delay={1}>
        <Panel>
          <PanelHead
            title="Organization Capacity"
            note={unconfigured > 0 ? `${num(unconfigured)} teachers without a capacity set` : null}
            detailsButton={
              <DetailsButton
                title="Instructor Utilization — full details"
                metric="instructorUtilization"
                rangeDays={rangeDays}
                columns={UTILIZATION_COLUMNS}
              />
            }
          />
          {configured.length && utilization !== null && utilization !== undefined ? (
            <div className="mt-5">
              <CapacityMeter pct={utilization}>
                Total capacity <b className="text-foreground">{num(capacity)} lessons/wk</b> · taught{' '}
                <b className="text-foreground">{actual.toLocaleString()}</b> · spare{' '}
                <b className="text-success">{spare.toLocaleString()} lessons/wk</b>
                <br />
                Weighted across {num(configured.length)} instructors with a weekly capacity configured.
              </CapacityMeter>
            </div>
          ) : (
            <NotAvailable
              message="No instructor has a weekly capacity set."
              requires="Set a weekly capacity on teachers in Settings → Teachers, and this meter plus every projected-utilization figure on the page starts working."
              height={140}
            />
          )}
        </Panel>
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal delay={1}>
          <Panel className="h-full">
            <PanelHead
              title="Utilization by Instructor"
              note="taught vs weekly capacity"
              detailsButton={
                <DetailsButton
                  title="Instructor Utilization — full details"
                  metric="instructorUtilization"
                  rangeDays={rangeDays}
                  columns={UTILIZATION_COLUMNS}
                />
              }
            />
            {configured.length ? (
              <div className="mt-4">
                <RankedBars
                  labelWidth={150}
                  rows={configured.map((t) => ({
                    label: t.teacher,
                    value: t.utilizationPct ?? 0,
                    sublabel: `${t.actualPerWeek} of ${t.weeklyCapacity} per wk${t.studio ? ` · ${t.studio}` : ''}`,
                  }))}
                  valueFormatter={(v) => `${Math.round(v)}%`}
                />
              </div>
            ) : (
              <Empty message="No instructors with a weekly capacity configured." height={200} />
            )}
          </Panel>
        </Reveal>

        <Reveal delay={2}>
          <Panel className="h-full">
            <PanelHead title="Teacher Opportunities" note="who to call this week" />
            <DataTable
              head={['Instructor', 'Ready to advance', 'Renewals due', 'Pipeline value']}
              minWidth={520}
              emptyMessage={all.length ? undefined : 'No instructors in scope.'}
            >
              {all.slice(0, 8).map((t) => (
                <Row key={t.teacher}>
                  <Cell first>{t.teacher}</Cell>
                  <Cell>
                    <Dash />
                  </Cell>
                  <Cell>
                    <Dash />
                  </Cell>
                  <Cell>
                    <Dash />
                  </Cell>
                </Row>
              ))}
            </DataTable>
            <Caveat>
              Instructors are real; the columns are not. Ranking students per teacher by readiness for the next tier,
              renewals coming due and pipeline value needs the per-student scoring the Priorities section is waiting on.
            </Caveat>
          </Panel>
        </Reveal>
      </div>
    </section>
  )
}
