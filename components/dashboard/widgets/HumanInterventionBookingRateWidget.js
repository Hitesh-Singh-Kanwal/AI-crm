'use client'

import { Card } from './shared'

export default function HumanInterventionBookingRateWidget({ humanInterventionBookingRate = [] }) {
  return (
    <Card className="p-5 rounded-[20px] border-2 border-border shadow-sm">
      <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
        Human Intervention Booking Rate
      </p>

      <div className="mt-4 space-y-3">
        {humanInterventionBookingRate.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <span className="text-[12px] text-muted-foreground">{item.label}</span>
            <span className="text-[12px] font-semibold text-foreground whitespace-nowrap">{item.value}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
