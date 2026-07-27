'use client'

import { Card, WidgetTitleRow, EmptyChart } from './shared'
import DonutChart from './DonutChart'
import DetailsButton from './DetailsButton'

const DETAIL_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone' },
  { key: 'studio', label: 'Studio' },
  { key: 'stage', label: 'Stage' },
  { key: 'createdAt', label: 'Created', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
]

export default function StudioBreakdownWidget({ perStudioBreakdown = [], defaultRange }) {
  const total = perStudioBreakdown.reduce((s, r) => s + r.totalLeads, 0)
  const data = perStudioBreakdown.map((r) => ({
    name: r.location,
    value: r.totalLeads,
    rate: r.bookingRatePct ?? (parseInt(r.bookingRate, 10) || 0),
  }))

  return (
    <Card>
      <WidgetTitleRow
        title="Per Studio Breakdown"
        detailsButton={
          <DetailsButton
            title="Per Studio Breakdown — full details"
            metric="leads"
            rangeDays={defaultRange}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {data.length > 0 ? (
        <div className="mt-4">
          <DonutChart
            data={data}
            centerLabel="Total"
            centerValue={total.toLocaleString()}
            height={210}
            valueFormatter={(v, payload) => `${Number(v).toLocaleString()} leads · ${payload.rate}% booked`}
          />
        </div>
      ) : (
        <EmptyChart message="No location data." />
      )}
    </Card>
  )
}
