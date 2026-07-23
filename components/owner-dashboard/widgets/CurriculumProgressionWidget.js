'use client'

import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import { FunnelStage, FunnelConnector } from './shared'
import WidgetHeader from './WidgetHeader'

export default function CurriculumProgressionWidget({ funnel, rangeDays, onRangeChange }) {
  const stages = funnel?.report4?.curriculumProgression || []
  const hasData = stages.some((s) => s.count > 0)

  return (
    <Card>
      <WidgetHeader title="Curriculum Progression" rangeDays={rangeDays} onRangeChange={onRangeChange} />
      <p className="mt-1 text-[11px] text-muted-foreground">
        Report 4 — how many students have ever reached each curriculum tier.
      </p>
      {hasData ? (
        <div className="mt-4 flex items-stretch justify-center gap-1 overflow-x-auto pb-1">
          {stages.map((s, i) => (
            <div key={s.label} className="flex items-stretch gap-1">
              {i > 0 && (
                <FunnelConnector
                  ratePct={stages[i - 1].count ? Math.round((s.count / stages[i - 1].count) * 100) : 0}
                />
              )}
              <FunnelStage label={s.label} value={s.count.toLocaleString()} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyChart message="No students have reached a curriculum tier yet." />
      )}
    </Card>
  )
}
