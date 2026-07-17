'use client'

import { Card } from './shared'

export default function FollowUpEffectivenessWidget({ followUpEffectiveness = [] }) {
  const maxSent = Math.max(...followUpEffectiveness.map((r) => r.sent), 1)

  return (
    <Card className="p-5 rounded-[20px] border-2 border-border shadow-sm">
      <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
        Follow-up Effectiveness
      </p>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_2fr] gap-6 pb-2">
            {['Contacts', 'Sent', 'Reply', 'Rate', 'Sent Visual'].map((h) => (
              <div key={h} className="text-[12px] font-semibold text-muted-foreground">{h}</div>
            ))}
          </div>
          <div className="h-px bg-border" />

          <div className="divide-y divide-border">
            {followUpEffectiveness.map((row) => (
              <div key={row.contacts} className="grid grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_2fr] gap-6 py-3 text-[13px] text-foreground">
                <div>{row.contacts}</div>
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

            <div className="grid grid-cols-[0.8fr_0.8fr_0.8fr_0.8fr_2fr] gap-6 py-3 text-[13px] font-semibold text-foreground">
              <div>Total</div>
              <div>{followUpEffectiveness.reduce((a, r) => a + r.sent, 0)}</div>
              <div>{followUpEffectiveness.reduce((a, r) => a + r.reply, 0)}</div>
              <div>—</div>
              <div />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
