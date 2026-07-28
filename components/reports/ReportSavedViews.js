'use client'

import { useEffect, useMemo, useState } from 'react'
import { Bookmark, BookmarkPlus, RotateCcw, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

const CONTROL_CLASS =
  'h-9 rounded-lg border-border bg-background text-[13px] shadow-sm focus:ring-[var(--studio-primary)]/30'

/**
 * Load / save / delete named filter presets for a report or dashboard details page.
 */
export function ReportSavedViews({
  reportSlug,
  savedViews = [],
  currentFilters,
  onApply,
  onSave,
  onDelete,
  onResetFilters,
  clearToken = 0,
  compact = false,
}) {
  const viewsForReport = useMemo(
    () => savedViews.filter((v) => v.reportSlug === reportSlug),
    [savedViews, reportSlug]
  )
  const [selectedId, setSelectedId] = useState('')
  const [name, setName] = useState('')
  const [saveError, setSaveError] = useState('')

  const selectedView = viewsForReport.find((v) => v.id === selectedId)

  useEffect(() => {
    if (clearToken > 0) setSelectedId('')
  }, [clearToken])

  function resetAppliedView() {
    setSelectedId('')
    onResetFilters?.()
  }

  function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      setSaveError('Enter a name for this view')
      return
    }
    const duplicate = viewsForReport.some(
      (v) => v.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (duplicate) {
      setSaveError('A view with that name already exists')
      return
    }
    setSaveError('')
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `view-${Date.now()}`
    onSave?.({
      id,
      reportSlug,
      name: trimmed,
      filters: currentFilters || {},
    })
    setSelectedId(id)
    setName('')
  }

  return (
    <div
      className={
        compact
          ? 'flex flex-col gap-3'
          : 'w-full rounded-xl border border-border/80 bg-card/80 p-3 shadow-sm sm:p-3.5'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--studio-primary)]/10 text-[var(--studio-primary)]">
            <Bookmark className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-foreground">Saved views</p>
            <p className="text-[11px] text-foreground/55">
              {viewsForReport.length
                ? `${viewsForReport.length} saved for this page`
                : 'Save your current filters to reuse later'}
            </p>
          </div>
        </div>
        {selectedId ? (
          <button
            type="button"
            onClick={resetAppliedView}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[12px] font-medium text-foreground/70 shadow-sm transition-colors hover:border-[var(--studio-primary)]/30 hover:bg-[var(--studio-primary)]/5 hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset view
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label
            htmlFor="saved-view-select"
            className="text-[11px] font-semibold uppercase tracking-[0.04em] text-foreground/55"
          >
            Load view
          </label>
          <div className="flex items-center gap-2">
            <Select
              id="saved-view-select"
              className={`${CONTROL_CLASS} w-[13.5rem] ${selectedId ? 'border-[var(--studio-primary)]/35' : ''}`}
              value={selectedId}
              onChange={(e) => {
                const id = e.target.value
                if (!id) {
                  resetAppliedView()
                  return
                }
                setSelectedId(id)
                const view = viewsForReport.find((v) => v.id === id)
                if (view) onApply?.(view.filters || {})
              }}
              disabled={viewsForReport.length === 0}
            >
              <option value="">
                {viewsForReport.length ? 'Select a view' : 'No views yet'}
              </option>
              {viewsForReport.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </Select>
            <button
              type="button"
              title={selectedView ? `Delete “${selectedView.name}”` : 'Select a view to delete'}
              disabled={!selectedId}
              onClick={() => {
                onDelete?.(selectedId)
                setSelectedId('')
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground/55 shadow-sm transition-colors hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[16rem]">
          <label
            htmlFor="saved-view-name"
            className="text-[11px] font-semibold uppercase tracking-[0.04em] text-foreground/55"
          >
            Save current filters
          </label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="saved-view-name"
              className={`${CONTROL_CLASS} min-w-[10rem] flex-1`}
              placeholder="e.g. East Delhi · 30 days"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (saveError) setSaveError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSave()
                }
              }}
            />
            <button
              type="button"
              disabled={!name.trim()}
              onClick={handleSave}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--studio-primary)] px-3.5 text-[12px] font-semibold text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              Save view
            </button>
          </div>
          {saveError ? (
            <p className="text-[11px] text-destructive">{saveError}</p>
          ) : null}
        </div>
      </div>

      {viewsForReport.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {viewsForReport.map((view) => {
            const active = view.id === selectedId
            return (
              <button
                key={view.id}
                type="button"
                title={active ? 'Click again to reset this view' : `Apply “${view.name}”`}
                onClick={() => {
                  if (active) {
                    resetAppliedView()
                    return
                  }
                  setSelectedId(view.id)
                  onApply?.(view.filters || {})
                }}
                className={[
                  'inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                  active
                    ? 'border-[var(--studio-primary)]/40 bg-[var(--studio-primary)]/10 text-[var(--studio-primary)]'
                    : 'border-border bg-background text-foreground/70 hover:border-[var(--studio-primary)]/25 hover:text-foreground',
                ].join(' ')}
              >
                {view.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
