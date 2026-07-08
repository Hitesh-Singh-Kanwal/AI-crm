'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { FILTER_SIDEBAR_STYLE, FILTER_SIDEBAR_WIDTH_CLASS } from '@/lib/filter-sidebar-constants'
import {
  EMPTY_MEMBER_FILTERS,
  getHiddenMemberFilterFields,
} from '@/lib/dynamic-list-member-filters'
import { getValidConditions } from '@/lib/lead-filter-fields'
import GroupedLeadFilterFields from '@/components/shared/GroupedLeadFilterFields'

export default function DynamicListMembersFilterPanel({
  open,
  appliedFilters,
  onClose,
  onApply,
  list = null,
  locations = [],
  forms = [],
  leadReasons = [],
  loadingOptions = false,
}) {
  const [draft, setDraft] = useState(appliedFilters)
  const hiddenFields = useMemo(() => getHiddenMemberFilterFields(list), [list])

  useEffect(() => {
    if (open) setDraft(appliedFilters)
  }, [open, appliedFilters])

  if (!open) return null

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
          <div>
            <h3 className="text-[18px] font-semibold text-foreground">Filters</h3>
            <p className="text-[12px] text-muted-foreground">Grouped by Lead Profile, UTM, Timing, and Activity</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...EMPTY_MEMBER_FILTERS,
                  search: draft.search,
                  searchOperator: draft.searchOperator,
                })
              }
              className="text-[13px] font-medium text-[var(--studio-primary)] hover:underline"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <GroupedLeadFilterFields
            draft={draft}
            onDraftChange={setDraft}
            hiddenFields={hiddenFields}
            locations={locations}
            forms={forms}
            leadReasons={leadReasons}
            loadingOptions={loadingOptions}
          />
        </div>

        <div className="flex gap-3 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-background text-[14px] font-semibold text-foreground hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() =>
              onApply?.({
                ...draft,
                conditions: getValidConditions(draft.conditions),
              })
            }
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-[var(--studio-primary)] text-[14px] font-semibold text-white hover:brightness-95"
          >
            Apply filters
          </button>
        </div>
      </aside>
    </>
  )
}
