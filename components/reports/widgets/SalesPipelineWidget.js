'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { chartCardClass } from './shared'

const PIPELINE_LABEL_POS = [
  'absolute left-[48px] top-[20px] text-[14px] leading-[20px] text-muted-foreground',
  'absolute left-[38px] top-[88px] text-[14px] leading-[20px] text-muted-foreground',
  'absolute left-[66px] top-[146px] text-[14px] leading-[20px] text-muted-foreground',
  'absolute right-[32px] top-[118px] text-[14px] leading-[20px] text-muted-foreground',
  'absolute right-[70px] top-[20px] text-[14px] leading-[20px] text-muted-foreground',
]

export default function SalesPipelineWidget({ pipelineData = [] }) {
  return (
    <div className={chartCardClass}>
      <h3 className="text-base font-bold uppercase tracking-[0.02em] text-[var(--studio-primary)]">Sales Pipeline</h3>
      <div className="mt-5">
        <div className="relative mx-auto h-[200px] w-full max-w-[575px]">
          <div className="absolute left-1/2 top-1/2 h-[170px] w-[170px] -translate-x-1/2 -translate-y-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pipelineData} dataKey="value" cx="50%" cy="50%" innerRadius={0} outerRadius={84} stroke="none">
                  {pipelineData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {pipelineData.slice(0, 5).map((item, i) => (
            <div key={item.name} className={PIPELINE_LABEL_POS[i]}>
              {item.name}: {item.percentage}%
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {pipelineData.map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
