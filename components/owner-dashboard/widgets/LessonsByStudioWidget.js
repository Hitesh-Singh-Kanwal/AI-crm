'use client'

import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import { RankedBarList } from './shared'
import WidgetHeader from './WidgetHeader'

export default function LessonsByStudioWidget({ lessons, rangeDays, onRangeChange }) {
  const data = [...(lessons?.byStudio || [])].sort((a, b) => b.count - a.count)

  return (
    <Card>
      <WidgetHeader title="Lessons Taught by Studio" rangeDays={rangeDays} onRangeChange={onRangeChange} />
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
