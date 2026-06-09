'use client'

import Switch from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { isWorkflowEventFormSubmission } from '@/lib/workflow-normalize'
import WorkflowFormMultiSelect from '@/components/workflow/WorkflowFormMultiSelect'

const fieldClass =
  'h-14 w-full rounded-lg border border-border bg-background px-4 text-[16px] text-foreground outline-none focus:border-[var(--studio-primary)]'
const compactFieldClass =
  'h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]'

export default function WorkflowMetaFields({
  event = '',
  formIDs = [],
  isGenericForm = false,
  reason = '',
  forms = [],
  reasons = [],
  formsLoading = false,
  reasonsLoading = false,
  onFormIDsChange,
  onIsGenericFormChange,
  onReasonChange,
  compact = false,
}) {
  const selectClass = compact ? compactFieldClass : fieldClass
  const labelClass = compact
    ? 'text-[13px] font-medium text-foreground'
    : 'text-[16px] font-semibold text-foreground'
  const hintClass = compact ? 'text-[11px] text-muted-foreground' : 'text-[12px] text-muted-foreground'

  const showFormFields = isWorkflowEventFormSubmission(event)

  return (
    <>
      {showFormFields && (
        <div className={cn('space-y-3', compact ? 'md:col-span-2' : 'md:col-span-2')}>
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className={labelClass}>Apply to all forms</div>
                <p className={cn(hintClass, 'mt-1')}>
                  When enabled, this workflow runs for every form submission. Turn off to pick specific forms.
                </p>
              </div>
              <Switch
                checked={isGenericForm}
                onCheckedChange={(checked) => onIsGenericFormChange?.(checked)}
                aria-label="Apply to all forms"
              />
            </div>

            {!isGenericForm && (
              <div className="mt-4 space-y-2">
                <label className={labelClass}>Forms *</label>
                <WorkflowFormMultiSelect
                  values={formIDs}
                  onChange={onFormIDsChange}
                  forms={forms}
                  loading={formsLoading}
                  compact={compact}
                  placeholder="Select one or more forms…"
                />
                <p className={hintClass}>Choose which forms trigger this workflow.</p>
              </div>
            )}

            <div className="mt-4 space-y-2 border-t border-border pt-4">
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
          </div>
        </div>
      )}
    </>
  )
}
