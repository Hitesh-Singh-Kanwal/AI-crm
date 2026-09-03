'use client'

import { Card, WidgetTitleRow, EmptyChart } from './shared'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'stage', label: 'Stage' },
  { key: 'studio', label: 'Studio' },
  { key: 'createdAt', label: 'Created', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
]

export default function ConversionFunnelWidget({ conversionFunnel = [], defaultRange }) {
  return (
    <Card>
      <WidgetTitleRow
        title="Conversion Funnel"
        detailsButton={
          <DetailsButton
            title="Conversion Funnel — full details"
            metric="leads"
            rangeDays={defaultRange}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {conversionFunnel.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Leads created in this period. Each step counts leads that reached that stage or any later one.
          </p>
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
                  style={{
                    width: `${stage.percentage}%`,
                    background: 'linear-gradient(90deg, var(--bar-gradient-start), var(--bar-gradient-end))',
                  }}
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
