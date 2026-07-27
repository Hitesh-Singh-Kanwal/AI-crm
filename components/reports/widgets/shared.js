import Link from 'next/link'
import { Table2 } from 'lucide-react'

export const chartCardClass =
  'h-full rounded-[20px] border-2 p-5 bg-card border-border text-card-foreground shadow-sm'

export function DetailsLink({ href, label = 'Details' }) {
  return (
    <Link
      href={href}
      title="Show full details"
      className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
    >
      <Table2 className="h-3 w-3" />
      {label}
    </Link>
  )
}

export function Trend({ type = 'up', text }) {
  const isUp = type === 'up'
  return (
    <div
      className={`mt-1 flex items-center gap-1 text-[14px] font-medium ${
        isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
      }`}
    >
      <span aria-hidden>{isUp ? '↗' : '↘'}</span>
      <span>{text}</span>
    </div>
  )
}
