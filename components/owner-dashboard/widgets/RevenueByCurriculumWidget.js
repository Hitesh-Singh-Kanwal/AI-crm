'use client'

import { Card, SectionLabel, EmptyChart } from '@/components/dashboard/widgets/shared'
import { RankedBarList } from './shared'

function formatMoney(n) {
  const num = Number(n) || 0
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 10000) return `$${(num / 1000).toFixed(1)}k`
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export default function RevenueByCurriculumWidget({ revenue }) {
  const data = (revenue?.byCurriculum || []).filter((r) => r.revenue > 0)

  return (
    <Card>
      <SectionLabel>Revenue by Curriculum Tier</SectionLabel>
      {data.length > 0 ? (
        <div className="mt-4">
          <RankedBarList
            rows={data.map((r) => ({ label: r.tier, value: r.revenue }))}
            valueFormatter={formatMoney}
            highlightFirst={false}
          />
        </div>
      ) : (
        <EmptyChart message="No curriculum-tagged purchases in this period." />
      )}
    </Card>
  )
}
