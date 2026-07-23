'use client'

import { CheckCircle2, Clock3, Headphones, UserX } from 'lucide-react'
import { Card, SectionLabel, EmptyChart } from './shared'
import DonutChart from './DonutChart'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleString() : '—') },
  { key: 'lead', label: 'Lead' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status' },
  { key: 'pickupMinutes', label: 'Pickup (min)' },
  { key: 'handleMinutes', label: 'Handle (min)' },
]

function parseCount(row) {
  if (typeof row?.count === 'number') return row.count
  const match = String(row?.value || '').match(/^(\d+)/)
  return match ? Number(match[1]) : 0
}

function parseMinutes(row) {
  if (typeof row?.count === 'number') return row.count
  const match = String(row?.value || '').match(/(\d+)/)
  return match ? Number(match[1]) : null
}

function KpiTile({ label, value, hint, icon: Icon, accent }) {
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-muted/40 to-transparent px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ background: `color-mix(in srgb, ${accent} 14%, transparent)`, color: accent }}
        >
          <Icon size={14} />
        </span>
      </div>
      <p className="mt-2 text-[28px] font-bold leading-none tracking-tight tabular-nums text-foreground">{value}</p>
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

function TimeCard({ label, minutes }) {
  const hasValue = minutes != null && !Number.isNaN(minutes)
  return (
    <div className="flex flex-1 flex-col justify-center rounded-2xl border border-border bg-muted/25 px-4 py-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-[34px] font-bold leading-none tracking-tight tabular-nums text-foreground">
          {hasValue ? minutes : '—'}
        </span>
        {hasValue && <span className="text-sm font-medium text-muted-foreground">min</span>}
      </div>
    </div>
  )
}

export default function HumanInterventionWidget({
  humanInterventionByStage = [],
  humanInterventionBookingRate = [],
  humanInterventionStatus = [],
  humanInterventionRequired = 0,
  defaultRange,
}) {
  const totalHandled = humanInterventionBookingRate.find((r) => r.label === 'Total Handled')
  const resolved = humanInterventionBookingRate.find((r) => r.label === 'Resolved')
  const inProgress = humanInterventionBookingRate.find((r) => r.label === 'Still In Progress')
  const abandoned = humanInterventionBookingRate.find((r) => r.label === 'Abandoned')
  const avgPickup = humanInterventionBookingRate.find((r) => r.label === 'Avg Time to Pickup')
  const handleTime = humanInterventionBookingRate.find((r) => r.label === 'Human Handle Time')

  const totalCount = parseCount(totalHandled)
  const resolvedCount = humanInterventionStatus.find((s) => s.name === 'Resolved')?.value ?? parseCount(resolved)
  const inProgressCount =
    humanInterventionStatus.find((s) => s.name === 'In Progress')?.value ??
    parseCount(inProgress) ??
    humanInterventionRequired
  const abandonedCount = humanInterventionStatus.find((s) => s.name === 'Abandoned')?.value ?? parseCount(abandoned)

  const resolveRate = totalCount ? Math.round((resolvedCount / totalCount) * 100) : 0
  const pickupMins = parseMinutes(avgPickup)
  const handleMins = parseMinutes(handleTime)

  const reasonData = humanInterventionByStage.map((r) => ({
    name: r.stage,
    value: r.count,
    percentage: r.pct,
  }))

  const statusData = [
    { name: 'Resolved', value: resolvedCount },
    { name: 'In progress', value: inProgressCount },
    { name: 'Abandoned', value: abandonedCount },
  ].filter((s) => s.value > 0)

  const hasData = totalCount > 0 || reasonData.length > 0 || inProgressCount > 0

  if (!hasData) {
    return (
      <Card>
        <SectionLabel>Human Intervention</SectionLabel>
        <EmptyChart message="No escalations this period." />
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <SectionLabel>Human Intervention</SectionLabel>
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <p className="text-[12px] text-muted-foreground">
              Resolve rate{' '}
              <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{resolveRate}%</span>
            </p>
          )}
          <DetailsButton
            title="Human Intervention — full details"
            metric="humanIntervention"
            rangeDays={defaultRange}
            columns={DETAIL_COLUMNS}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiTile
          label="Total handled"
          value={totalCount}
          hint="Queue items this period"
          icon={Headphones}
          accent="#C81D77"
        />
        <KpiTile
          label="Resolved"
          value={resolvedCount}
          hint={`${resolveRate}% of total`}
          icon={CheckCircle2}
          accent="#10b981"
        />
        <KpiTile
          label="In progress"
          value={inProgressCount}
          hint="Waiting or claimed"
          icon={Clock3}
          accent="#F72585"
        />
        <KpiTile
          label="Abandoned"
          value={abandonedCount}
          hint="Left without resolution"
          icon={UserX}
          accent="#f43f5e"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.95fr]">
        <div className="rounded-2xl border border-border/80 bg-muted/15 p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--studio-primary)]">
            Escalation reasons
          </p>
          {reasonData.length > 0 ? (
            <DonutChart
              data={reasonData}
              centerLabel="Cases"
              centerValue={reasonData.reduce((s, r) => s + r.value, 0).toLocaleString()}
              height={200}
            />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No reason breakdown available.</p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border/80 bg-muted/15 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--studio-primary)]">
              Queue status
            </p>
            {statusData.length > 0 ? (
              <div className="space-y-3">
                {statusData.map((row) => {
                  const pct = totalCount ? Math.round((row.value / totalCount) * 100) : 0
                  const color =
                    row.name === 'Resolved' ? '#10b981' : row.name === 'Abandoned' ? '#f43f5e' : '#F72585'
                  return (
                    <div key={row.name} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                          {row.name}
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          {row.value} · {pct}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(pct, row.value > 0 ? 4 : 0)}%`,
                            background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 60%, white))`,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No status data.</p>
            )}
          </div>

          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
            <TimeCard label="Avg pickup time" minutes={pickupMins} />
            <TimeCard label="Avg handle time" minutes={handleMins} />
          </div>
        </div>
      </div>
    </Card>
  )
}
