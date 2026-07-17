'use client'

import { cn } from '@/lib/utils'
import { Card } from './shared'

export default function ApiExpenseWidget({ apiExpenseByChannel = [] }) {
  return (
    <Card className="p-5 rounded-[20px] border-2 border-border shadow-sm">
      <p className="text-[16px] font-bold tracking-[0.08em] text-[var(--studio-primary)] uppercase">
        API Expense by channel (This Period)
      </p>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[2.2fr_1fr_1fr_1fr_0.8fr_2fr] gap-6 pb-2">
            {['Channel', 'Total Uses', 'Cost/Use', 'Total Cost', '% of Total', 'Cost Visual'].map((h) => (
              <div key={h} className="text-[14px] font-bold text-foreground">{h}</div>
            ))}
          </div>

          <div className="h-px bg-border" />

          <div className="divide-y divide-border">
            {apiExpenseByChannel.map((row, i) => {
              const isTotal = !!row.isTotal
              return (
                <div
                  key={i}
                  className={cn(
                    'grid grid-cols-[2.2fr_1fr_1fr_1fr_0.8fr_2fr] gap-6 py-3',
                    isTotal ? 'font-semibold text-foreground' : 'text-foreground'
                  )}
                >
                  <div className="text-[14px]">{row.channel}</div>
                  <div className="text-[14px]">{row.totalUses?.toLocaleString?.() ?? row.totalUses}</div>
                  <div className="text-[14px]">{row.costPerUse}</div>
                  <div className="text-[14px]">{row.totalCost}</div>
                  <div className="text-[14px]">{row.pctTotal}</div>

                  <div className="flex items-center gap-3">
                    {!isTotal ? (
                      <>
                        <div className="h-3 flex-1 rounded-full bg-muted">
                          <div
                            className="h-3 rounded-full"
                            style={{
                              width: `${row.barPct}%`,
                              background: `linear-gradient(90deg, var(--side-gradient-start) 0%, var(--side-gradient-end) 100%)`,
                            }}
                          />
                        </div>
                        <span className="text-[12px] text-muted-foreground whitespace-nowrap">{row.totalCost}</span>
                      </>
                    ) : (
                      <span className="text-[12px] text-muted-foreground whitespace-nowrap">{row.totalCost}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}
