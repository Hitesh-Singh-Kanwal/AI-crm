'use client'

import { cn } from '@/lib/utils'

const fieldClass =
  'h-14 w-full rounded-lg border border-border bg-background px-4 text-[16px] text-foreground outline-none focus:border-[var(--studio-primary)]'
const compactFieldClass =
  'h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]'

export default function WorkflowMetaFields({
  formID,
  reason,
  forms = [],
  reasons = [],
  formsLoading = false,
  reasonsLoading = false,
  onFormChange,
  onReasonChange,
  compact = false,
}) {
  const selectClass = compact ? compactFieldClass : fieldClass
  const labelClass = compact
    ? 'text-[13px] font-medium text-foreground'
    : 'text-[16px] font-semibold text-foreground'

  return (
    <>
      <div className="space-y-2">
        <label className={labelClass}>Form</label>
        <select
          value={formID}
          onChange={(e) => onFormChange(e.target.value)}
          disabled={formsLoading}
          className={cn(selectClass, formsLoading && 'opacity-60')}
        >
          <option value="">Select form…</option>
          {forms.map((form) => {
            const id = form?._id || form?.id
            if (!id) return null
            return (
              <option key={id} value={id}>
                {form?.name || 'Untitled form'}
              </option>
            )
          })}
        </select>
      </div>

      <div className="space-y-2">
        <label className={labelClass}>Reason</label>
        <select
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          disabled={reasonsLoading}
          className={cn(selectClass, reasonsLoading && 'opacity-60')}
        >
          <option value="">Select reason…</option>
          {reasons.map((r) => {
            const code = r?.reasonCode || r?.name
            if (!code) return null
            return (
              <option key={r._id || code} value={code}>
                {r?.name || code}
              </option>
            )
          })}
        </select>
      </div>
    </>
  )
}
