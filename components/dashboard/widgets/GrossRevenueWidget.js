'use client'

import { Card, SectionLabel } from './shared'

export default function GrossRevenueWidget({ grossRevenue = 0 }) {
  return (
    <Card className="p-5">
      <SectionLabel>Gross Revenue (Intro Bookings)</SectionLabel>
      <p className="text-[46px] font-bold mt-1 text-foreground">${grossRevenue.toLocaleString()}</p>
    </Card>
  )
}
