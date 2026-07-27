'use client'

import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import { RankedBarList } from './shared'
import WidgetHeader from './WidgetHeader'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'teacher', label: 'Teacher' },
  { key: 'studio', label: 'Studio' },
  { key: 'title', label: 'Lesson' },
  { key: 'status', label: 'Status' },
]

export default function InstructorUtilizationWidget({ lessons, rangeDays, onRangeChange }) {
  const all = lessons?.instructorUtilization || []
  const configured = all.filter((t) => t.weeklyCapacity !== null)
  const unconfigured = all.filter((t) => t.weeklyCapacity === null)

  return (
    <Card>
      <WidgetHeader
        title="Instructor Utilization"
        rangeDays={rangeDays}
        onRangeChange={onRangeChange}
        right={
          unconfigured.length > 0 && (
            <span className="text-[11px] text-muted-foreground">{unconfigured.length} without capacity set</span>
          )
        }
        detailsButton={
          <DetailsButton
            title="Instructor Utilization — full details"
            metric="instructorUtilization"
            rangeDays={rangeDays}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {configured.length > 0 ? (
        <div className="mt-4">
          <RankedBarList
            rows={configured.map((t) => ({
              label: t.teacher,
              sublabel: `${t.actualPerWeek}/${t.weeklyCapacity} per wk`,
              value: t.utilizationPct,
            }))}
            valueFormatter={(v) => `${v}%`}
          />
        </div>
      ) : (
        <EmptyChart message="Set a weekly capacity on teachers in Settings > Teachers to see utilization." />
      )}
    </Card>
  )
}
