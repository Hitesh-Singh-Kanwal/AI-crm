'use client'

import DonutChart from '@/components/dashboard/widgets/DonutChart'
import { Card, EmptyChart } from '@/components/dashboard/widgets/shared'
import WidgetHeader from './WidgetHeader'

function formatMoney(n) {
  const num = Number(n) || 0
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 10000) return `$${(num / 1000).toFixed(1)}k`
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export default function MembershipRevenueWidget({ revenue, rangeDays, onRangeChange }) {
  const rows = revenue?.membershipByType || []
  const data = rows.map((r) => ({ name: r.membershipName, value: r.revenue }))
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <Card>
      <WidgetHeader title="Membership Revenue by Type" rangeDays={rangeDays} onRangeChange={onRangeChange} />
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
