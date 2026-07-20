'use client'

import { Card, SectionLabel, EmptyChart } from './shared'

export default function ConversionFunnelWidget({ conversionFunnel = [] }) {
  return (
    <Card>
      <SectionLabel>Conversion Funnel</SectionLabel>
      {conversionFunnel.length > 0 ? (
        <div className="mt-4 space-y-3">
          {conversionFunnel.map((stage) => (
            <div key={stage.stage} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{stage.stage}</span>
                <span className="text-muted-foreground">
                  {stage.count} ({stage.percentage}%)
                </span>
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
      ) : (
        <EmptyChart message="No funnel data." />
      )}
    </Card>
  )
}
