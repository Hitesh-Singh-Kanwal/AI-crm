'use client'

import { useEffect, useState } from 'react'
import { Settings2, X } from 'lucide-react'
import { FILTER_SIDEBAR_STYLE, FILTER_SIDEBAR_WIDTH_CLASS } from '@/lib/filter-sidebar-constants'
import { EMPTY_CUSTOMER_FILTERS } from '@/lib/customer-page-filters'
import { getValidConditions } from '@/lib/customer-filter-fields'
import GroupedLeadFilterFields from '@/components/shared/GroupedLeadFilterFields'

export default function CustomersFilterPanel({
  open,
  appliedFilters,
  onClose,
  onApply,
  locations = [],
  teachers = [],
  tags = [],
  memberships = [],
  loadingOptions = false,
}) {
  const [draft, setDraft] = useState(appliedFilters)

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
          <div className="flex items-center gap-2.5">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--studio-primary)]/10 text-[var(--studio-primary)]">
              <Settings2 className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-[18px] font-semibold text-foreground">Filter</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...EMPTY_CUSTOMER_FILTERS,
                  search: draft.search,
                  teacherID: draft.teacherID,
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
            entityType="customer"
            draft={draft}
            onDraftChange={setDraft}
            locations={locations}
            teachers={teachers}
            tags={tags}
            memberships={memberships}
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
