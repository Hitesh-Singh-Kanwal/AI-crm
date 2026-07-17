'use client'

import { Card } from './shared'

function ResponseRateTable({ title, rows, labelKey }) {
  const maxSent = Math.max(...rows.map((r) => r.sent), 1)
  return (
    <div>
      <p className="text-[12px] font-semibold text-foreground">{title}</p>
      <div className="mt-2">
        <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.6fr_2fr] gap-4 pb-2">
          {['', 'Sent', 'Reply', 'Rate', 'Sent Visual'].map((h, i) => (
            <div key={i} className="text-[12px] font-semibold text-muted-foreground">{h}</div>
          ))}
        </div>
        <div className="h-px bg-border" />
        <div className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row[labelKey]} className="grid grid-cols-[1fr_0.7fr_0.7fr_0.6fr_2fr] gap-4 py-3 text-[13px] text-foreground">
              <div className="truncate">{row[labelKey]}</div>
              <div>{row.sent}</div>
              <div>{row.reply}</div>
              <div>{row.rate}</div>
              <div className="flex items-center gap-3">
                <div className="h-3 flex-1 rounded-full bg-muted">
                  <div
                    className="h-3 rounded-full"
                    style={{
                      width: `${Math.round((row.sent / maxSent) * 100)}%`,
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
  )
}

export default function ResponseRateWidget({ responseRateByDay = [], responseRateByTime = [] }) {
  return (
    <Card className="p-5 rounded-[20px] border-2 border-border shadow-sm">
      <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
        Response Rate by Day &amp; Time
      </p>

      <div className="mt-4 space-y-6">
        <ResponseRateTable title="By Day of Week:" rows={responseRateByDay} labelKey="day" />
        <ResponseRateTable title="By Time of Day:" rows={responseRateByTime} labelKey="time" />
      </div>
    </Card>
  )
}
