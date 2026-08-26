'use client'

import { useMemo } from 'react'
import DonutChart from '@/components/dashboard/widgets/DonutChart'
import LeadsDetailsButton from '@/components/owner-dashboard/widgets/LeadsDetailsButton'
import { formatFieldDisplayValue } from '@/lib/dynamic-list-normalize'
import { Caveat, Empty, Legend, NotAvailable, Panel, PanelHead, Reveal, SectionHead, moneyShort, num } from '../chrome'
import { Cell, DataTable, RankedBars, Row, StackedCompare } from '../viz'

const LEAD_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'uploadType', label: 'Source', format: (v) => formatFieldDisplayValue(v) },
  { key: 'stage', label: 'Stage', format: (v) => formatFieldDisplayValue(v) },
  { key: 'createdAt', label: 'Created', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
]

export default function MarketingSection({ classic, rangeDays }) {
  const sources = useMemo(() => classic?.leadsBySourceConversion || [], [classic])
  const revenueBySource = useMemo(() => classic?.revenueBySource || [], [classic])
  const zipRows = useMemo(() => classic?.leadDensityByZip || [], [classic])
  const studios = useMemo(() => classic?.perStudioBreakdown || [], [classic])
  const totalLeads = sources.reduce((s, r) => s + (Number(r.totalLeads) || 0), 0)
  const totalSourceRevenue = revenueBySource.reduce((s, r) => s + (Number(r.revenue) || 0), 0)

  return (
    <section id="od-marketing" className="mt-24 scroll-mt-32">
      <SectionHead
        number="07"
        title="Marketing"
        emphasis="Performance"
        tag="Q2 · WHERE DO STUDENTS COME FROM?"
        subtitle="Which channels produce the best customers — not just the most leads."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Reveal delay={1}>
          <Panel className="h-full">
            <PanelHead
              title="Leads by Source"
              note={totalLeads ? `${num(totalLeads)} leads in window` : null}
              detailsButton={<LeadsDetailsButton rangeDays={rangeDays} columns={LEAD_COLUMNS} />}
            />
            {sources.length ? (
              <div className="mt-4">
                <DonutChart
                  data={sources.map((r) => ({ name: r.leadSource, value: r.totalLeads }))}
                  centerLabel="Leads"
                  centerValue={num(totalLeads)}
                  height={200}
                  valueFormatter={(v) => `${num(v)} leads`}
                />
              </div>
            ) : (
              <Empty message="No leads in this period." height={220} />
            )}
          </Panel>
        </Reveal>

        <Reveal delay={2}>
          <Panel className="h-full">
            <PanelHead title="Revenue by Source" note="attributed to the converting lead" />
            {revenueBySource.length ? (
              <div className="mt-4">
                <RankedBars
                  rows={revenueBySource.map((r) => ({ label: r.leadSource, value: r.revenue }))}
                  valueFormatter={moneyShort}
                />
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {moneyShort(totalSourceRevenue)} total
                </p>
              </div>
            ) : (
              <Empty message="No attributed revenue in this period." height={220} />
            )}
          </Panel>
        </Reveal>
      </div>

      <Reveal className="mt-4">
        <Panel>
          <PanelHead
            title="Channel Economics"
            detailsButton={<LeadsDetailsButton rangeDays={rangeDays} columns={LEAD_COLUMNS} />}
          />
          {sources.length ? (
            <>
              <DataTable
                head={['Source', 'Leads', 'Bookings', 'Lead → Booking', 'Cost / Lead', 'Revenue', 'Cost / Sale', 'ROAS']}
                minWidth={760}
              >
                {sources.map((r, i) => (
                  <Row key={r.leadSource}>
                    <Cell first tone={i === 0 ? 'text-[var(--studio-primary)]' : 'text-foreground'}>
                      {r.leadSource}
                    </Cell>
                    <Cell>{num(r.totalLeads)}</Cell>
                    <Cell>{num(r.bookings)}</Cell>
                    <Cell
                      tone={
                        r.convRatePct >= 30 ? 'text-success font-bold' : r.convRatePct >= 15 ? 'text-warning' : 'text-muted-foreground'
                      }
                    >
                      {r.convRate}
                    </Cell>
                    <Cell tone="text-muted-foreground">{r.costPerLead}</Cell>
                    <Cell tone="text-muted-foreground">&mdash;</Cell>
                    <Cell tone="text-muted-foreground">&mdash;</Cell>
                    <Cell tone="text-muted-foreground">&mdash;</Cell>
                  </Row>
                ))}
              </DataTable>
              <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground">
                Cost per lead is the platform&apos;s own messaging and AI spend spread evenly across leads — it is not ad
                spend. Revenue, cost per sale and ROAS stay blank until ad spend is imported per channel and revenue is
                attributed to a source.
              </p>
            </>
          ) : (
            <NotAvailable
              message="Lead source data is not visible to your role."
              requires="Channel economics come from the classic dashboard overview, which needs the Lead Conversion dashboard permission."
              height={180}
            />
          )}
        </Panel>
      </Reveal>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal delay={1}>
          <Panel className="h-full">
            <PanelHead title="Lead Density by ZIP" note="top 8 · converted leads only" />
            <DataTable
              head={['ZIP', 'Leads', 'Starters', 'Revenue']}
              minWidth={420}
              emptyMessage={zipRows.length ? undefined : 'No converted leads with a known ZIP in this period.'}
            >
              {zipRows.map((r) => (
                <Row key={r.zip}>
                  <Cell first>{r.zip}</Cell>
                  <Cell tone="text-[var(--studio-primary)] font-bold">{num(r.leads)}</Cell>
                  <Cell>{num(r.starters)}</Cell>
                  <Cell>{moneyShort(r.revenue)}</Cell>
                </Row>
              ))}
            </DataTable>
            <Caveat>
              A ZIP is only known once a lead converts — the address lives on the Customer record, not the Lead — so
              unconverted leads never appear here.
            </Caveat>
          </Panel>
        </Reveal>

        <Reveal delay={2}>
          <Panel className="h-full">
            <PanelHead
              title="Leads by Studio"
              note="booked vs not booked"
              detailsButton={<LeadsDetailsButton rangeDays={rangeDays} columns={LEAD_COLUMNS} />}
            />
            {studios.length ? (
              <>
                <div className="mt-3">
                  <Legend
                    items={[
                      { label: 'Booked an intro', color: 'var(--studio-primary)' },
                      { label: 'Not booked', color: 'color-mix(in srgb, hsl(var(--destructive)) 38%, transparent)' },
                    ]}
                  />
                </div>
                <div className="mt-3">
                  <StackedCompare
                    rows={studios.map((r) => ({
                      label: r.location,
                      sublabel: `${r.bookingRate} booking rate`,
                      a: r.bookings,
                      b: Math.max(r.totalLeads - r.bookings, 0),
                      valueLabel: num(r.totalLeads),
                    }))}
                  />
                </div>
                <p className="mt-3 text-[10.5px] leading-relaxed text-muted-foreground">
                  Split by outcome rather than by source — per-studio lead counts are not broken down by channel on the
                  server.
                </p>
              </>
            ) : (
              <NotAvailable
                message="Per-studio lead data is not visible to your role."
                requires="Needs the Lead Conversion dashboard permission."
                height={280}
              />
            )}
          </Panel>
        </Reveal>
      </div>
    </section>
  )
}
