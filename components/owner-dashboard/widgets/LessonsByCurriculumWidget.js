'use client'

import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import { RankedBarList } from './shared'
import WidgetHeader from './WidgetHeader'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'studio', label: 'Studio' },
  { key: 'teacher', label: 'Teacher' },
  { key: 'tier', label: 'Curriculum Tier' },
  { key: 'title', label: 'Lesson' },
]

export default function LessonsByCurriculumWidget({ lessons, rangeDays, onRangeChange }) {
  const tiers = lessons?.byCurriculum || []
  const data = tiers.filter((r) => r.count > 0)
  const emptyMessage = tiers.length === 0
    ? 'No curriculum tiers set up yet. Tag packages with a curriculum in Settings to see tier activity.'
    : 'No lessons taught under a curriculum-tagged package in this period.'

  return (
    <Card>
      <WidgetHeader
        title="Lessons by Curriculum Tier"
        rangeDays={rangeDays}
        onRangeChange={onRangeChange}
        detailsButton={
          <DetailsButton
            title="Lessons by Curriculum Tier — full details"
            metric="lessonsByCurriculum"
            rangeDays={rangeDays}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {data.length > 0 ? (
        <div className="mt-4">
          <RankedBarList
            rows={data.map((r) => ({ label: r.tier, value: r.count }))}
            highlightFirst={false}
          />
        </div>
      ) : (
        <EmptyChart message={emptyMessage} />
      )}
    </Card>
  )
}
