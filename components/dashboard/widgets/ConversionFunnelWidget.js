'use client'

import { Card, SectionLabel, EmptyChart } from './shared'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'stage', label: 'Stage' },
  { key: 'createdAt', label: 'Created', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
]

// Maps a funnel row's label to the backend's stageGroup roll-up so "full
// details" for e.g. "Engaged" shows the same inclusive population
// (engaged+qualified+booked+actualized) the percentage bar is computed from.
const STAGE_GROUP_BY_LABEL = {
  Leads: null,
  Engaged: 'engaged',
  Qualified: 'qualified',
  Booked: 'booked',
  Converted: 'converted',
}

export default function ConversionFunnelWidget({ conversionFunnel = [], defaultRange }) {
  return (
    <Card>
      <SectionLabel>Conversion Funnel</SectionLabel>
      {conversionFunnel.length > 0 ? (
        <div className="mt-4 space-y-3">
          {conversionFunnel.map((stage) => (
            <div key={stage.stage} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{stage.stage}</span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {stage.count} ({stage.percentage}%)
                  <DetailsButton
                    title={`${stage.stage} — full details`}
                    metric="leads"
                    rangeDays={defaultRange}
                    params={
                      STAGE_GROUP_BY_LABEL[stage.stage] ? { stageGroup: STAGE_GROUP_BY_LABEL[stage.stage] } : {}
                    }
                    columns={DETAIL_COLUMNS}
                    compact
                  />
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
