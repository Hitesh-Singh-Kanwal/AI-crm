'use client'

import { Card } from './shared'

export default function HumanInterventionByStageWidget({ humanInterventionByStage = [] }) {
  const maxCount = Math.max(...humanInterventionByStage.map((r) => r.count), 1)
  const totalCount = humanInterventionByStage.reduce((a, r) => a + r.count, 0)

  return (
    <Card className="p-5 rounded-[20px] border-2 border-border shadow-sm">
      <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
        Human Intervention by Reason
      </p>

      <div className="mt-4">
        <div className="grid grid-cols-[1.4fr_0.5fr_0.4fr_1.2fr] gap-4 pb-2">
          {['Reason', 'Count', '%', 'Visual'].map((h) => (
            <div key={h} className="text-[12px] font-semibold text-muted-foreground">{h}</div>
          ))}
        </div>
        <div className="h-px bg-border" />

        <div className="divide-y divide-border">
          {humanInterventionByStage.length === 0 && (
            <p className="py-6 text-sm text-muted-foreground">No escalations in this period.</p>
          )}
          {humanInterventionByStage.map((row) => (
            <div key={row.stage} className="grid grid-cols-[1.4fr_0.5fr_0.4fr_1.2fr] gap-4 py-3 text-[13px] text-foreground">
              <div className="truncate">{row.stage}</div>
              <div>{row.count}</div>
              <div>{row.pct}%</div>
              <div className="flex items-center gap-3">
                <div className="h-3 flex-1 rounded-full bg-muted">
                  <div
                    className="h-3 rounded-full"
                    style={{
                      width: `${Math.round((row.count / maxCount) * 100)}%`,
                      background: `linear-gradient(90deg, var(--bar-gradient-end) 0%, var(--bar-gradient-start) 100%)`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          {humanInterventionByStage.length > 0 && (
            <div className="grid grid-cols-[1.4fr_0.5fr_0.4fr_1.2fr] gap-4 py-3 text-[13px] font-semibold text-foreground">
              <div>Total</div>
              <div>{totalCount}</div>
              <div>100%</div>
              <div />
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
