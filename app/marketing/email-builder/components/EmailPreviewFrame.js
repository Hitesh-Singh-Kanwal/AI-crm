'use client'

import { useMemo, useState } from 'react'
import { Monitor, Smartphone, Mail } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function EmailPreviewFrame({
  html,
  emptyMessage = 'Nothing to preview yet.',
  emptyHint,
  onEmptyAction,
  emptyActionLabel,
  sourceLabel,
  subject,
  className,
  compact = false,
  embedded = false,
  fullWidth = false,
  showDeviceToggle = true,
}) {
  const [device, setDevice] = useState('desktop') // 'desktop' | 'mobile'
  const hasHtml = !!String(html || '').trim()

  const frameWidth = useMemo(() => {
    if (device === 'mobile') return 'max-w-[390px]'
    return 'max-w-[680px]'
  }, [device])

  const inner = (
    <div className={cn('w-full mx-auto transition-all duration-200', frameWidth)}>
      <div className="rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden w-full">
        <div className="border-b border-slate-100 bg-slate-50/95 px-3 py-2 space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
            </div>
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-[11px] font-medium text-slate-500 truncate">
                {sourceLabel || 'Inbox preview'}
              </span>
            </div>
            {device === 'mobile' ? (
              <span className="text-[10px] text-slate-400 tabular-nums">390px</span>
            ) : (
              <span className="text-[10px] text-slate-400 tabular-nums">Desktop</span>
            )}
          </div>
          {subject || hasHtml ? (
            <div className="space-y-0.5 pl-0.5">
              <p className="text-[11px] text-slate-400">
                From <span className="text-slate-600 font-medium">Your studio</span>
              </p>
              <p className="text-sm font-semibold text-slate-800 truncate">
                {subject || 'Untitled template'}
              </p>
            </div>
          ) : null}
        </div>

        {hasHtml ? (
          <div
            className={cn(
              'prose prose-sm max-w-none text-slate-800 w-full overflow-x-auto bg-white',
              compact ? 'p-3' : 'p-4 md:p-5',
            )}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div
            className={cn(
              'flex flex-col items-center justify-center text-center w-full',
              compact ? 'py-10 px-4' : 'py-14 px-6',
            )}
          >
            <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <Mail className="h-6 w-6 text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-700">{emptyMessage}</p>
            {emptyHint ? (
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm">{emptyHint}</p>
            ) : null}
            {onEmptyAction && emptyActionLabel ? (
              <button
                type="button"
                onClick={onEmptyAction}
                className="mt-4 text-xs font-semibold text-brand hover:underline"
              >
                {emptyActionLabel}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )

  const toolbar = showDeviceToggle ? (
    <div className="flex items-center justify-center gap-1 mb-2 shrink-0">
      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => setDevice('desktop')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
            device === 'desktop'
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:text-slate-800',
          )}
        >
          <Monitor className="h-3.5 w-3.5" />
          Desktop
        </button>
        <button
          type="button"
          onClick={() => setDevice('mobile')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
            device === 'mobile'
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:text-slate-800',
          )}
        >
          <Smartphone className="h-3.5 w-3.5" />
          Mobile
        </button>
      </div>
    </div>
  ) : null

  if (embedded) {
    return (
      <div className={cn('h-full w-full', className)}>
        {toolbar}
        {inner}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-full min-h-0',
        fullWidth
          ? 'flex flex-col flex-1 h-full rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-100/90 to-slate-50 p-3'
          : cn(
              'rounded-xl bg-gradient-to-b from-slate-50 to-slate-100/80 border border-slate-200/80',
              compact ? 'p-3' : 'p-4',
            ),
        className,
      )}
    >
      {toolbar}
      <div
        className={cn(
          fullWidth && 'flex-1 flex items-start justify-center w-full min-h-0 overflow-y-auto',
        )}
      >
        {inner}
      </div>
    </div>
  )
}
