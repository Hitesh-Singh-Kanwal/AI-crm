'use client'

import { Card, SectionLabel, EmptyChart } from './shared'
import DonutChart from './DonutChart'

export default function PipelineWidget({ pipeline = [] }) {
  const total = pipeline.reduce((s, p) => s + p.value, 0)

  return (
    <Card>
      <SectionLabel>Sales Pipeline</SectionLabel>
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
