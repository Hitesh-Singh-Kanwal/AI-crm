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
  { key: 'customer', label: 'Customer' },
  { key: 'studio', label: 'Studio' },
  { key: 'source', label: 'Source' },
  { key: 'name', label: 'Package / Membership' },
  { key: 'dueAmount', label: 'Due', format: (v) => formatMoney(v) },
]

export default function OutstandingBalancesWidget({ revenue, rangeDays, onRangeChange }) {
  const data = [...(revenue?.outstandingBalances || [])].sort((a, b) => b.outstanding - a.outstanding)
  const total = revenue?.totalOutstanding || 0

  return (
    <Card>
      <WidgetHeader
        title="Outstanding Balances"
        rangeDays={rangeDays}
        onRangeChange={onRangeChange}
        right={
          <span className="text-[18px] font-bold leading-none tabular-nums text-[var(--studio-primary)]">
            {formatMoney(total)}
          </span>
        }
        detailsButton={
          <DetailsButton
            title="Outstanding Balances — full details"
            metric="outstandingBalances"
            rangeDays={rangeDays}
            columns={DETAIL_COLUMNS}
          />
        }
      />
      {data.length > 0 ? (
        <div className="mt-4">
          <RankedBarList rows={data.map((r) => ({ label: r.location, value: r.outstanding }))} valueFormatter={formatMoney} />
        </div>
      ) : (
        <EmptyChart message="No outstanding balances." />
      )}
    </Card>
  )
}
