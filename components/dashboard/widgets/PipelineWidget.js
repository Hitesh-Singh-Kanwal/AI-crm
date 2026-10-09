'use client'

import { Card, WidgetTitleRow, EmptyChart } from './shared'
import DonutChart from './DonutChart'
import DetailsButton from './DetailsButton'
import { formatDate } from '@/lib/utils'

const DETAIL_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'stage', label: 'Stage' },
  { key: 'studio', label: 'Studio' },
  { key: 'createdAt', label: 'Created', format: (v) => formatDate(v) || '—' },
]

export default function PipelineWidget({ pipeline = [], defaultRange }) {
  const total = pipeline.reduce((s, p) => s + p.value, 0)

  return (
    <Card>
      <WidgetTitleRow
        title="Sales Pipeline"
        detailsButton={
          <DetailsButton
            title="Sales Pipeline — full details"
            metric="leads"
            rangeDays={defaultRange}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {pipeline.length > 0 ? (
        <div className="mt-4">
          <p className="mb-3 text-xs text-muted-foreground">
            Leads created in this period, by current stage.
          </p>
          <DonutChart
            data={pipeline}
            centerLabel="Total"
            centerValue={total.toLocaleString()}
            height={210}
          />
        </div>
      ) : (
        <EmptyChart message="No pipeline data." />
      )}
    </Card>
  )
}
