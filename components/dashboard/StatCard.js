import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatCurrency } from '@/lib/utils'

export default function StatCard({ icon: Icon, title, value, change, format = 'number' }) {
  const isPositive = change > 0
  const formattedValue = format === 'currency' ? formatCurrency(value) : format === 'percentage' ? `${value}%` : value.toLocaleString()

  return (
    <Card className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all animate-fade-in">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wide mb-1">
              {title}
            </p>
            <h3 className="text-lg md:text-xl font-bold text-slate-900 mb-2 md:mb-3">
              {formattedValue}
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              {isPositive ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
              )}
              <span
                className={cn(
                  'text-xs font-semibold',
                  isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {change > 0 && '+'}{change}%
              </span>
              <span className="text-xs text-slate-400">vs last month</span>
            </div>
          </div>
          <div className="h-10 w-10 md:h-11 md:w-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Icon className="h-5 w-5 text-slate-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


