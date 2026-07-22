'use client'

import { Card, SectionLabel, EmptyChart } from '@/components/dashboard/widgets/shared'
import { RankedBarList } from './shared'

export default function LessonsByTeacherWidget({ lessons }) {
  const data = (lessons?.byTeacher || []).slice(0, 10)

  return (
    <Card>
      <SectionLabel>Lessons Taught by Teacher</SectionLabel>
      {data.length > 0 ? (
        <div className="mt-4">
          <RankedBarList rows={data.map((r) => ({ label: r.teacher, value: r.count }))} />
        </div>
      ) : (
        <EmptyChart message="No completed lessons in this period." />
      )}
    </Card>
  )
}
