'use client'

import { Card } from './shared'

export default function PerStudioBreakdownWidget({ perStudioBreakdown = [] }) {
  const maxLeads = Math.max(...perStudioBreakdown.map((r) => r.totalLeads), 1)

  return (
    <Card className="p-5 rounded-[20px] border-2 border-border shadow-sm">
      <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
        Per Studio Breakdown
      </p>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[1.6fr_0.9fr_0.8fr_0.8fr_2fr] gap-6 pb-2">
            {['Location', 'Total Leads', 'Bookings', 'Booking Rate', 'Leads Visual'].map((h) => (
              <div key={h} className="text-[12px] font-semibold text-muted-foreground">{h}</div>
            ))}
          </div>
          <div className="h-px bg-border" />

          <div className="divide-y divide-border">
            {perStudioBreakdown.length === 0 && (
              <p className="py-6 text-sm text-muted-foreground">No location data for this period.</p>
            )}
            {perStudioBreakdown.map((row, idx) => (
              <div key={`${row.location}-${idx}`} className="grid grid-cols-[1.6fr_0.9fr_0.8fr_0.8fr_2fr] gap-6 py-3 text-[13px] text-foreground">
                <div className="truncate">{row.location}</div>
                <div>{row.totalLeads}</div>
                <div>{row.bookings}</div>
                <div>{row.bookingRate}</div>
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-muted">
                    <div
                      className="h-3 rounded-full"
                      style={{
                        width: `${Math.round((row.totalLeads / maxLeads) * 100)}%`,
                        background: `linear-gradient(90deg, var(--side-gradient-start) 0%, var(--side-gradient-end) 100%)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}
