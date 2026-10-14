'use client'

import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import { FunnelStage } from './shared'
import WidgetHeader from './WidgetHeader'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'name', label: 'Customer' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'studio', label: 'Studio' },
  { key: 'highestTier', label: 'Highest Tier Reached' },
]

export default function CurriculumProgressionWidget({ funnel, rangeDays, onRangeChange }) {
  const stages = funnel?.report4?.curriculumProgression || []
  const hasData = stages.some((s) => s.count > 0)
  const maxCount = Math.max(...stages.map((s) => s.count), 1)

  return (
    <Card>
      <WidgetHeader
        title="Curriculum Progression"
        // Highest tier ever reached — lifetime, not window-scoped — so no range dropdown.
        right={<span className="text-[11px] text-muted-foreground">All time</span>}
        detailsButton={
          <DetailsButton
            title="Curriculum Progression — full details"
            metric="curriculumProgression"
            rangeDays={rangeDays}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Report 4 — how many students have ever reached each curriculum tier.
      </p>
      {hasData ? (
        // Wrapping grid, not a horizontal rail — orgs have many tiers, and a
        // centered overflow rail clipped the first ones out of reach.
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
          {stages.map((s, i) => (
            <FunnelStage
              key={s.label}
              label={s.label}
              value={s.count.toLocaleString()}
              barPct={Math.round((s.count / maxCount) * 100)}
              metrics={
                i > 0
                  ? [
                      {
                        label: 'From previous tier',
                        value: `${stages[i - 1].count ? Math.round((s.count / stages[i - 1].count) * 100) : 0}%`,
                      },
                    ]
                  : []
              }
            />
          ))}
        </div>
      ) : (
        <EmptyChart message="No students have reached a curriculum tier yet." />
      )}
    </Card>
  )
}
