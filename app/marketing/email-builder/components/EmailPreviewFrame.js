'use client'

import { Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function EmailPreviewFrame({
  html,
  emptyMessage = 'Nothing to preview yet.',
  sourceLabel,
  className,
  compact = false,
  embedded = false,
  fullWidth = false,
}) {
  const hasHtml = !!String(html || '').trim()

  const inner = (
    <div className={cn('w-full', !fullWidth && !embedded && 'mx-auto max-w-[720px]')}>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden w-full">
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-medium text-slate-500 truncate">Inbox preview</span>
          </div>
          </div>

        {hasHtml ? (
          <div
            className={cn(
              'prose prose-sm max-w-none text-slate-800 w-full overflow-x-auto',
              compact ? 'p-4' : 'p-5 md:p-8'
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div
            className={cn(
              'flex flex-col items-center justify-center text-center w-full',
              compact ? 'py-10 px-4' : 'py-16 px-6'
            )}
          >
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Mail className="h-6 w-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-500 max-w-sm">{emptyMessage}</p>
          </div>
        )}
      </div>
    </div>
  )

  if (embedded) {
    return <div className={cn('h-full w-full', className)}>{inner}</div>
  }

  return (
    <div
      className={cn(
        'w-full min-h-0',
        fullWidth
          ? 'flex flex-col flex-1 h-full rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/60 p-4 md:p-6'
          : cn(
              'rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/80 border border-slate-200/80',
              compact ? 'p-3' : 'p-4 md:p-6'
            ),
        className
      )}
    >
      <div className={cn(fullWidth && 'flex-1 flex items-start justify-center w-full min-h-0 overflow-y-auto')}>
        {inner}
      </div>
    </div>
  )
}
