'use client'

import { Card, WidgetTitleRow, EmptyChart } from './shared'
import DonutChart from './DonutChart'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'stage', label: 'Stage' },
  { key: 'studio', label: 'Studio' },
  { key: 'createdAt', label: 'Created', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
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
            params={{ allTime: 'true' }}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {pipeline.length > 0 ? (
        <div className="mt-4">
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
