'use client'

import { Card, SectionLabel, EmptyChart } from '@/components/dashboard/widgets/shared'
import { RankedBarList } from './shared'

export default function LessonsByCurriculumWidget({ lessons }) {
  const data = (lessons?.byCurriculum || []).filter((r) => r.count > 0)

  return (
    <Card>
      <SectionLabel>Lessons by Curriculum Tier</SectionLabel>
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
