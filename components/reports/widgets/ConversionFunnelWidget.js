'use client'

import { chartCardClass } from './shared'

export default function ConversionFunnelWidget({ conversionFunnelData = [] }) {
  return (
    <div className={chartCardClass}>
      <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">Conversion Funnel</h3>
      <div className="mt-4 space-y-3">
        {conversionFunnelData.map((stage) => (
          <div key={stage.stage} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{stage.stage}</span>
              <span className="text-muted-foreground">{stage.count} ({stage.percentage}%)</span>
            </div>
            <div className="h-5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${stage.percentage}%`, background: 'var(--side-gradient-css)' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
