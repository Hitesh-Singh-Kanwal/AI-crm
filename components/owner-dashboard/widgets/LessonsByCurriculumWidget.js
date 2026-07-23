'use client'

import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import { RankedBarList } from './shared'
import WidgetHeader from './WidgetHeader'

export default function LessonsByCurriculumWidget({ lessons, rangeDays, onRangeChange }) {
  const data = (lessons?.byCurriculum || []).filter((r) => r.count > 0)

  return (
    <Card>
      <WidgetHeader title="Lessons by Curriculum Tier" rangeDays={rangeDays} onRangeChange={onRangeChange} />
      {data.length > 0 ? (
        <div className="mt-4">
          <RankedBarList
            rows={data.map((r) => ({ label: r.tier, value: r.count }))}
            highlightFirst={false}
          />
        </div>
      ) : (
        <EmptyChart message="No curriculum-tagged lessons in this period." />
      )}
    </Card>
  )
}
