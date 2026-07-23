'use client'

import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import { StackedBarRow } from './shared'
import WidgetHeader from './WidgetHeader'

export default function StudentHealthByStudioWidget({ studentHealth, rangeDays, onRangeChange }) {
  const data = [...(studentHealth?.perStudio || [])].sort((a, b) => b.active - a.active)

  return (
    <Card>
      <WidgetHeader
        title="Student Health by Studio"
        rangeDays={rangeDays}
        onRangeChange={onRangeChange}
        right={
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
        }
      />
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
