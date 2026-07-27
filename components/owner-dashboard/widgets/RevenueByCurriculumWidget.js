'use client'

import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import { RankedBarList } from './shared'
import WidgetHeader from './WidgetHeader'
import DetailsButton from './DetailsButton'

function formatMoney(n) {
  const num = Number(n) || 0
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 10000) return `$${(num / 1000).toFixed(1)}k`
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

const DETAIL_COLUMNS = [
  { key: 'date', label: 'Date', format: (v) => (v ? new Date(v).toLocaleDateString() : '—') },
  { key: 'customer', label: 'Customer' },
  { key: 'studio', label: 'Studio' },
  { key: 'tier', label: 'Curriculum Tier' },
  { key: 'amount', label: 'Amount', format: (v) => formatMoney(v) },
]

export default function RevenueByCurriculumWidget({ revenue, rangeDays, onRangeChange }) {
  const data = (revenue?.byCurriculum || []).filter((r) => r.revenue > 0)

  return (
    <Card>
      <WidgetHeader
        title="Revenue by Curriculum Tier"
        rangeDays={rangeDays}
        onRangeChange={onRangeChange}
        detailsButton={
          <DetailsButton
            title="Revenue by Curriculum Tier — full details"
            metric="revenueByCurriculum"
            rangeDays={rangeDays}
            columns={DETAIL_COLUMNS}
          />
        }
      />
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
