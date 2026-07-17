'use client'

import { Card, SectionLabel } from './shared'

export default function NetRevenueWidget({ netRevenue = 0 }) {
  return (
    <Card className="p-5">
      <SectionLabel>Net Revenue (Revenue – API Costs)</SectionLabel>
      <p className="text-[46px] font-bold mt-1 text-emerald-600 dark:text-emerald-400">
        ${netRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </p>
    </Card>
  )
}
