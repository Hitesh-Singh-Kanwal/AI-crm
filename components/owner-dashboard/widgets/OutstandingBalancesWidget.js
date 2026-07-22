'use client'

import { Card, SectionLabel, EmptyChart } from '@/components/dashboard/widgets/shared'
import { RankedBarList } from './shared'

function formatMoney(n) {
  const num = Number(n) || 0
  if (Math.abs(num) >= 1000000) return `$${(num / 1000000).toFixed(1)}M`
  if (Math.abs(num) >= 10000) return `$${(num / 1000).toFixed(1)}k`
  return `$${num.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export default function OutstandingBalancesWidget({ revenue }) {
  const data = [...(revenue?.outstandingBalances || [])].sort((a, b) => b.outstanding - a.outstanding)
  const total = revenue?.totalOutstanding || 0

  return (
    <Card>
      <div className="flex items-baseline justify-between">
        <SectionLabel>Outstanding Balances</SectionLabel>
        <span className="text-[26px] font-bold leading-none tabular-nums text-[var(--studio-primary)]">
          {formatMoney(total)}
        </span>
      </div>
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
