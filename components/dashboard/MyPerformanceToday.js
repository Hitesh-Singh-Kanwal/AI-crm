'use client'

import { TrendingDown, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const SECTION_TITLE = 'MY PERFORMANCE TODAY'

const defaultMetrics = [
  {
    id: 'conversations',
    value: '12',
    sub: '75% Booked',
  },
  {
    id: 'avg-response',
    value: '8 min',
    sub: '2 min better',
    improvement: true,
  },
  {
    id: 'conversion',
    value: '75%',
    sub: 'vs AI 28%',
  },
  {
    id: 'rating',
    value: '4.8',
    sub: '12 Ratings',
    icon: 'star',
  },
]

function Card({ children, className }) {
  return (
    <div
      className={cn('bg-white border border-slate-100 shadow-sm overflow-hidden', className)}
      style={{ borderRadius: 20 }}
    >
      {children}
    </div>
  )
}

export default function MyPerformanceToday({ metrics = defaultMetrics }) {
  return (
    <div className="flex flex-col gap-4">
      <p
        className="font-bold uppercase tracking-wider text-xs sm:text-[11px]"
        style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '0.16em', color: 'var(--studio-primary)' }}
      >
        {SECTION_TITLE}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.id} className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-slate-900">
                  {m.value}
                  {m.icon === 'star' && (
                    <Star className="inline-block w-6 h-6 text-amber-400 fill-amber-400 ml-1 align-middle" />
                  )}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {m.improvement && <TrendingDown className="inline w-4 h-4 mr-1 text-emerald-600 align-middle" />}
                  {m.sub}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
