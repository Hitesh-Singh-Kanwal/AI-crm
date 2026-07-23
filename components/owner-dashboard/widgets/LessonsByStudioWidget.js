'use client'

import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import { RankedBarList } from './shared'
import WidgetHeader from './WidgetHeader'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'studio', label: 'Studio' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'title', label: 'Lesson' },
  { key: 'status', label: 'Status' },
]

export default function LessonsByStudioWidget({ lessons, rangeDays, onRangeChange }) {
  const data = [...(lessons?.byStudio || [])].sort((a, b) => b.count - a.count)

  return (
    <Card>
      <WidgetHeader
        title="Lessons Taught by Studio"
        rangeDays={rangeDays}
        onRangeChange={onRangeChange}
        detailsButton={
          <DetailsButton
            title="Lessons by Studio — full details"
            metric="lessonsByStudio"
            rangeDays={rangeDays}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {data.length > 0 ? (
        <div className="mt-4">
          <RankedBarList rows={data.map((r) => ({ label: r.location, value: r.count }))} />
        </div>
      ) : (
        <EmptyChart message="No completed lessons in this period." />
      )}
    </Card>
  )
}
