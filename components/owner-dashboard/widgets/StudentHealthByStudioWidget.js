'use client'

import { Card, SectionLabel, EmptyChart } from '@/components/dashboard/widgets/shared'
import { StackedBarRow } from './shared'

export default function StudentHealthByStudioWidget({ studentHealth }) {
  const data = [...(studentHealth?.perStudio || [])].sort((a, b) => b.active - a.active)

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionLabel>Student Health by Studio</SectionLabel>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--studio-primary)' }} />
            Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: 'color-mix(in srgb, var(--studio-primary) 15%, transparent)' }} />
            Not booked
          </span>
        </div>
      </div>
      {data.length > 0 ? (
        <div className="mt-4">
          <StackedBarRow
            rows={data.map((r) => ({
              label: r.location,
              sublabel: `${r.bookedPct}% booked · ${r.avgLessonsPerActiveStudentPerWeek}/wk`,
              a: r.booked,
              b: r.notBooked,
              valueLabel: r.active.toLocaleString(),
            }))}
          />
        </div>
      ) : (
        <EmptyChart message="No active students in this period." />
      )}
    </Card>
  )
}
