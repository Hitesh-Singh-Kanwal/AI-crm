'use client'

import { useEffect, useState } from 'react'
import { Settings2, X } from 'lucide-react'
import { FILTER_SIDEBAR_STYLE, FILTER_SIDEBAR_WIDTH_CLASS } from '@/lib/filter-sidebar-constants'
import DateRangePresets from '@/components/dashboard-builder/DateRangePresets'
import { Select } from '@/components/ui/select'
import { dateBoundsFromPresetDays } from '@/lib/reports/reportFilters'
import GroupedLeadFilterFields from '@/components/shared/GroupedLeadFilterFields'
import { DASHBOARD_DETAILS_FILTER_CATALOGS, REPORT_FILTER_CATALOGS } from '@/lib/report-filter-catalogs'
import { buildCatalogFromColumns } from '@/lib/reports/buildCatalogFromColumns'

const EMPTY_DRAFT_EXTRAS = { conditions: [], conditionLogic: 'AND', search: '' }

export function ReportFilterPanel({
  open,
  appliedFilters,
  onClose,
  onApply,
  studios = [],
  teachers = [],
  programs = [],
  catalogKey,
  columns = [],
  defaultDateRangeDays = 30,
  timeZone,
  savedViewsSlot = null,
}) {
  const [draft, setDraft] = useState(appliedFilters)
  const catalog =
    DASHBOARD_DETAILS_FILTER_CATALOGS[catalogKey] ||
    REPORT_FILTER_CATALOGS[catalogKey] ||
    buildCatalogFromColumns(columns)

  useEffect(() => {
    if (open) setDraft(appliedFilters)
  }, [open, appliedFilters])

  if (!open) return null

  const dateRangeValue = draft.datePreset
    ? Number(draft.datePreset)
    : draft.dateFrom && draft.dateTo
      ? { from: draft.dateFrom, to: draft.dateTo }
      : defaultDateRangeDays

  function resetDraft() {
    const bounds = dateBoundsFromPresetDays(defaultDateRangeDays || 30, timeZone)
    setDraft({
      ...draft,
      ...bounds,
      datePreset: String(defaultDateRangeDays || 30),
      studioId: '',
      teacherId: '',
      programId: '',
      ...EMPTY_DRAFT_EXTRAS,
    })
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
      />

      <aside
        style={FILTER_SIDEBAR_STYLE}
        className={`fixed inset-y-0 right-0 z-50 flex ${FILTER_SIDEBAR_WIDTH_CLASS} flex-col border-l border-border bg-card shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--studio-primary)]/10 text-[var(--studio-primary)]">
              <Settings2 className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-[18px] font-semibold text-foreground">Filter</h3>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={resetDraft} className="text-[13px] font-medium text-[var(--studio-primary)] hover:underline">
              Reset
            </button>
            <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-foreground/55">Period</label>
            <DateRangePresets
              value={dateRangeValue}
              defaultDays={defaultDateRangeDays}
              onChange={(next) => {
                if (typeof next === 'number') {
                  const bounds = dateBoundsFromPresetDays(next, timeZone)
                  setDraft((d) => ({ ...d, ...bounds, datePreset: String(next) }))
                  return
                }
                if (typeof next === 'object' && next.from && next.to) {
                  setDraft((d) => ({ ...d, dateFrom: next.from, dateTo: next.to, datePreset: '' }))
                }
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-foreground/55">Studio</label>
              <Select value={draft.studioId || ''} onChange={(e) => setDraft((d) => ({ ...d, studioId: e.target.value }))}>
                <option value="">All studios</option>
                {studios.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-foreground/55">Teacher</label>
              <Select value={draft.teacherId || ''} onChange={(e) => setDraft((d) => ({ ...d, teacherId: e.target.value }))}>
                <option value="">All teachers</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-[0.04em] text-foreground/55">Package</label>
              <Select value={draft.programId || ''} onChange={(e) => setDraft((d) => ({ ...d, programId: e.target.value }))}>
                <option value="">All packages</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </Select>
            </div>
          </div>

          <div className="border-t border-border/70 pt-5">
            {catalog ? (
              <GroupedLeadFilterFields
                entityType="report"
                catalogKey={catalogKey}
                catalogOverride={catalog}
                draft={{ conditions: draft.conditions || [], conditionLogic: draft.conditionLogic || 'AND' }}
                onDraftChange={(next) => setDraft((d) => ({ ...d, conditions: next.conditions, conditionLogic: next.conditionLogic }))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No column filters available for this view yet.</p>
            )}
          </div>

          {savedViewsSlot ? <div className="border-t border-border/70 pt-5">{savedViewsSlot}</div> : null}
        </div>

        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button type="button" onClick={onClose} className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-background text-[14px] font-semibold text-foreground hover:bg-muted/40">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApply?.(draft)}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--studio-primary)] text-[14px] font-semibold text-white hover:brightness-95"
          >
            Apply filters
          </button>
        </div>
      </aside>
    </>
  )
}
