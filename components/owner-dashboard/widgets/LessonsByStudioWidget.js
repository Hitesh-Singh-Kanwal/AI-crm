'use client'

import { Card, SectionLabel, EmptyChart } from '@/components/dashboard/widgets/shared'
import { RankedBarList } from './shared'

export default function LessonsByStudioWidget({ lessons }) {
  const data = [...(lessons?.byStudio || [])].sort((a, b) => b.count - a.count)

  return (
    <Card>
      <SectionLabel>Lessons Taught by Studio</SectionLabel>
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
