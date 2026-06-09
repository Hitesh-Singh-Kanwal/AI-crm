'use client'

import { useEffect, useMemo, useState } from 'react'
import { Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateWorkflowStep } from '@/lib/workflow-normalize'
import WorkflowStepFields from '@/components/workflow/WorkflowStepFields'

function stepTypeLabel(type) {
  if (type === 'aiCall') return 'AI Call'
  if (type === 'humanCall') return 'Human Call'
  if (type === 'email') return 'Email'
  if (type === 'sms') return 'SMS'
  return String(type || 'Step')
}

function dayLabel(day) {
  if (day === 0) return 'Day 0'
  return `Day ${day}`
}

export default function WorkflowStepEditorPanel({
  day,
  stepNumber,
  step,
  leadStageOptions = [],
  canRemove = false,
  onSave,
  onClose,
  onRemove,
}) {
  const [draft, setDraft] = useState(() => ({ ...step }))

  useEffect(() => {
    setDraft({ ...step })
  }, [step._uiId])

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(step), [draft, step])
  const canSave = validateWorkflowStep(draft)

  const handleClose = () => {
    setDraft({ ...step })
    onClose?.()
  }

  const handleSave = () => {
    if (!canSave) return
    onSave?.({ ...draft })
    onClose?.()
  }

  return (
    <div className="ml-0 md:ml-[calc(9rem+1rem)]">
      <div className="rounded-2xl border border-primary/25 bg-card shadow-md">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-primary">
              {dayLabel(day)} · Step {stepNumber}
              {isDirty && (
                <span className="ml-2 font-medium normal-case text-amber-600 dark:text-amber-400">
                  · Unsaved changes
                </span>
              )}
            </div>
            <h4 className="mt-1 text-[18px] font-bold text-foreground">
              Configure {stepTypeLabel(draft.type)}
            </h4>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Edit below, then save or close to discard changes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-3 text-[12px] font-medium text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted/50"
              aria-label="Close without saving"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          <WorkflowStepFields
            step={draft}
            leadStageOptions={leadStageOptions}
            hideDay
            layout="panel"
            onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          />
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-[14px] font-medium text-foreground hover:bg-muted/40"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              'inline-flex h-11 items-center rounded-lg bg-[var(--studio-primary)] px-5 text-[14px] font-semibold text-white hover:brightness-95',
              !canSave && 'cursor-not-allowed opacity-60'
            )}
          >
            Save step
          </button>
        </div>
      </div>
    </div>
  )
}
