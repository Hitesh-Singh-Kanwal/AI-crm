'use client'

import { Card, SectionLabel, EmptyChart } from './shared'
import DonutChart from './DonutChart'

export default function StudioBreakdownWidget({ perStudioBreakdown = [] }) {
  const total = perStudioBreakdown.reduce((s, r) => s + r.totalLeads, 0)
  const data = perStudioBreakdown.map((r) => ({
    name: r.location,
    value: r.totalLeads,
    rate: r.bookingRatePct ?? (parseInt(r.bookingRate, 10) || 0),
  }))

  return (
    <Card>
      <SectionLabel>Per Studio Breakdown</SectionLabel>
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
