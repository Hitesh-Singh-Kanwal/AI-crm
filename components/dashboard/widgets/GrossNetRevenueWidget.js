'use client'

import { Card, SectionLabel } from './shared'

export default function GrossNetRevenueWidget({ grossRevenue = 0, netRevenue = 0 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Card className="p-5">
        <SectionLabel>Gross Revenue (Intro Bookings)</SectionLabel>
        <p className="text-[46px] font-bold mt-1 text-foreground">${grossRevenue.toLocaleString()}</p>
      </Card>

      <Card className="p-5">
        <SectionLabel>Net Revenue (Revenue – API Costs)</SectionLabel>
        <p className="text-[46px] font-bold mt-1 text-emerald-600 dark:text-emerald-400">
          ${netRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </p>
      </Card>
    </div>
  )
}
