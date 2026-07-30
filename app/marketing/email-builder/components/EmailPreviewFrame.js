'use client'

import { useState } from 'react'
import { Monitor, Smartphone, Mail, Signal, Wifi, BatteryFull } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScaledInboxHtmlEmail } from '@/app/inbox/components/InboxHtmlEmailFrame'

function MobileStatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-2.5 pb-1 text-[11px] font-semibold text-slate-900 tabular-nums select-none">
      <span>9:41</span>
      <div className="flex items-center gap-1 text-slate-800">
        <Signal className="h-3 w-3" />
        <Wifi className="h-3 w-3" />
        <BatteryFull className="h-3.5 w-3.5" />
      </div>
    </div>
  )
}

function MobileInboxChrome({ subject, sourceLabel }) {
  return (
    <div className="border-b border-slate-200/80 bg-white px-4 pb-2.5 pt-1">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {sourceLabel || 'Inbox'}
      </p>
      <p className="mt-0.5 truncate text-[15px] font-semibold leading-snug text-slate-900">
        {subject || 'Untitled template'}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-slate-500">
        From <span className="font-medium text-slate-700">Your studio</span>
      </p>
    </div>
  )
}

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
  const isMobile = device === 'mobile'
  const phoneScreenHeight = compact ? 520 : 640

  const emptyState = (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center w-full bg-white',
        compact ? 'py-10 px-4' : 'py-14 px-6',
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
        <Mail className="h-6 w-6 text-slate-300" />
      </div>
      <p className="text-sm font-medium text-slate-700">{emptyMessage}</p>
      {emptyHint ? (
        <p className="mt-1.5 max-w-sm text-xs text-slate-500">{emptyHint}</p>
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
  )

  // Identical canvas for both modes — only the chrome + scale factor change.
  const emailBody = hasHtml ? (
    <ScaledInboxHtmlEmail
      key={`preview-${device}`}
      html={html}
      title={subject || 'Email preview'}
      minHeight={compact ? 160 : 220}
      maxHeight={isMobile ? phoneScreenHeight : 900}
      viewportHeight={isMobile ? phoneScreenHeight : null}
    />
  ) : null

  const desktopPreview = (
    <div className="mx-auto w-full max-w-[800px] transition-all duration-200">
      <div className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md">
        <div className="space-y-1 border-b border-slate-100 bg-slate-50/95 px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate text-[11px] font-medium text-slate-500">
                {sourceLabel || 'Inbox preview'}
              </span>
            </div>
            <span className="text-[10px] tabular-nums text-slate-400">Desktop</span>
          </div>
          {subject || hasHtml ? (
            <div className="space-y-0.5 pl-0.5">
              <p className="text-[11px] text-slate-400">
                From <span className="font-medium text-slate-600">Your studio</span>
              </p>
              <p className="truncate text-sm font-semibold text-slate-800">
                {subject || 'Untitled template'}
              </p>
            </div>
          ) : null}
        </div>

        {hasHtml ? <div className="w-full bg-white">{emailBody}</div> : emptyState}
      </div>
    </div>
  )

  const mobilePreview = (
    <div className="mx-auto flex w-full max-w-[420px] flex-col items-center px-2">
      <div
        className={cn(
          'relative w-full max-w-[390px] overflow-hidden rounded-[2rem]',
          'border-[10px] border-slate-900 bg-slate-900 shadow-2xl shadow-slate-900/20',
        )}
      >
        <div className="pointer-events-none absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-slate-900" />

        <div className="overflow-hidden rounded-[1.35rem] bg-white">
          <MobileStatusBar />
          <MobileInboxChrome subject={subject} sourceLabel={sourceLabel} />

          {hasHtml ? emailBody : <div style={{ height: phoneScreenHeight }}>{emptyState}</div>}

          <div className="flex justify-center bg-white py-2">
            <span className="h-1 w-28 rounded-full bg-slate-900/80" />
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-[11px] text-slate-500">
        Same desktop layout, scaled to phone · scroll inside to read
      </p>
    </div>
  )

  const toolbar = showDeviceToggle ? (
    <div className="mb-3 flex shrink-0 items-center justify-center gap-1">
      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => setDevice('desktop')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
            !isMobile ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800',
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
            isMobile ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          <Smartphone className="h-3.5 w-3.5" />
          Mobile
        </button>
      </div>
    </div>
  ) : null

  const preview = isMobile ? mobilePreview : desktopPreview

  if (embedded) {
    return (
      <div className={cn('h-full w-full', className)}>
        {toolbar}
        {preview}
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
              'rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/80',
              compact ? 'p-3' : 'p-4',
            ),
        className,
      )}
    >
      {toolbar}
      <div
        className={cn(
          fullWidth && 'flex min-h-0 w-full flex-1 justify-center overflow-y-auto',
          isMobile ? 'items-start pt-1 pb-4' : 'items-start',
        )}
      >
        {preview}
      </div>
    </div>
  )
}
