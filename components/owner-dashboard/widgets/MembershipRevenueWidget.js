'use client'

import DonutChart from '@/components/dashboard/widgets/DonutChart'
import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
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
  { key: 'membership', label: 'Membership' },
  { key: 'method', label: 'Method' },
  { key: 'amount', label: 'Amount', format: (v) => formatMoney(v) },
]

export default function MembershipRevenueWidget({ revenue, rangeDays, onRangeChange }) {
  const rows = revenue?.membershipByType || []
  const data = rows.map((r) => ({ name: r.membershipName, value: r.revenue }))
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <Card>
      <WidgetHeader
        title="Membership Revenue by Type"
        rangeDays={rangeDays}
        onRangeChange={onRangeChange}
        detailsButton={
          <DetailsButton
            title="Membership Revenue — full details"
            metric="membershipRevenue"
            rangeDays={rangeDays}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {data.length > 0 ? (
        <DonutChart
          data={data}
          centerLabel="Total"
          centerValue={formatMoney(total)}
          height={210}
          valueFormatter={(v) => formatMoney(v)}
        />
      ) : (
        <EmptyChart message="No membership revenue in this period." />
      )}
    </Card>
  )
}
