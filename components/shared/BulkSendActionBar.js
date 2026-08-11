'use client'

import { Mail, MessageSquare, Trash2, X } from 'lucide-react'

/**
 * Selection toolbar for bulk SMS / email / delete (same pattern as dynamic list members).
 */
export default function BulkSendActionBar({
  selectedCount = 0,
  entityLabel = 'item',
  onSendSms,
  onSendEmail,
  onClear,
  onDelete,
  canDelete = false,
  deleting = false,
  showSelectAll = false,
  selectAllTotal = 0,
  pageCount = 0,
  onSelectAll,
  selectingAll = false,
}) {
  if (selectedCount <= 0) return null

  const plural = selectedCount === 1 ? entityLabel : `${entityLabel}s`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200/70 bg-gradient-to-r from-emerald-500/10 via-violet-500/10 to-sky-500/10 px-4 py-3 shadow-sm dark:border-violet-500/25">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--studio-primary)] to-violet-500 px-2.5 text-[13px] font-bold text-white shadow-md shadow-violet-500/20">
            {selectedCount}
          </span>
          <div>
            <div className="text-[14px] font-semibold text-foreground">
              {selectedCount} {plural} selected
            </div>
            <div className="text-[12px] text-muted-foreground">
              Choose an action for the selected {plural}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSendSms}
            className="inline-flex h-10 items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-[13px] font-semibold text-white shadow-md shadow-emerald-500/30 transition hover:brightness-105"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
              <MessageSquare className="h-4 w-4" />
            </span>
            Send SMS
          </button>
          <button
            type="button"
            onClick={onSendEmail}
            className="inline-flex h-10 items-center gap-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 px-4 text-[13px] font-semibold text-white shadow-md shadow-violet-500/30 transition hover:brightness-105"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
              <Mail className="h-4 w-4" />
            </span>
            Send email
          </button>
          {canDelete && typeof onDelete === 'function' ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex h-10 items-center gap-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 px-4 text-[13px] font-semibold text-white shadow-md shadow-rose-500/30 transition hover:brightness-105 disabled:opacity-60"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 ring-1 ring-white/30">
                <Trash2 className="h-4 w-4" />
              </span>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClear}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-orange-50 px-3 text-[13px] font-semibold text-rose-700 transition hover:from-rose-100 hover:to-orange-100 dark:border-rose-500/30 dark:from-rose-500/10 dark:to-orange-500/10 dark:text-rose-300"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 ring-1 ring-rose-500/20">
              <X className="h-4 w-4 text-rose-600 dark:text-rose-300" />
            </span>
            Clear
          </button>
        </div>
      </div>

      {showSelectAll && selectAllTotal > pageCount && selectedCount < selectAllTotal && (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-2 text-[12px] text-muted-foreground">
          All {pageCount} {pageCount === 1 ? entityLabel : `${entityLabel}s`} on this page are selected.{' '}
          <button
            type="button"
            onClick={onSelectAll}
            disabled={selectingAll}
            className="font-semibold text-[var(--studio-primary)] hover:underline disabled:opacity-50"
          >
            {selectingAll ? 'Selecting…' : `Select all ${selectAllTotal} ${entityLabel}s`}
          </button>
        </div>
      )}
    </div>
  )
}
