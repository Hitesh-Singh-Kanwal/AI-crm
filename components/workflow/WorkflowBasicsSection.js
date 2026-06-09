'use client'

import {
  ArrowRightLeft,
  FileText,
  PencilLine,
  Sparkles,
  Zap,
} from 'lucide-react'
import Switch from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import {
  WORKFLOW_EVENT_OPTIONS,
  isWorkflowEventFormSubmission,
} from '@/lib/workflow-normalize'
import WorkflowFormMultiSelect from '@/components/workflow/WorkflowFormMultiSelect'

const EVENT_META = {
  non: {
    icon: Sparkles,
    description: 'No automatic trigger — use for manual or default workflows.',
  },
  form_submission: {
    icon: FileText,
    description: 'Starts when someone submits a form you choose.',
  },
  lead_updated: {
    icon: PencilLine,
    description: 'Runs when lead profile or contact details change.',
  },
  lead_moved_stage: {
    icon: ArrowRightLeft,
    description: 'Runs when a lead moves to a new pipeline stage.',
  },
  custom_event: {
    icon: Zap,
    description: 'Runs on a custom event from your studio setup.',
  },
}

function FieldLabel({ children, required, hint, className }) {
  return (
    <div className={className}>
      <label className="text-[13px] font-semibold text-foreground">
        {children}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {hint && <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  )
}

export default function WorkflowBasicsSection({
  name = '',
  description = '',
  event = '',
  formIDs = [],
  isGenericForm = false,
  reason = '',
  forms = [],
  reasons = [],
  formsLoading = false,
  reasonsLoading = false,
  onNameChange,
  onDescriptionChange,
  onEventChange,
  onFormIDsChange,
  onIsGenericFormChange,
  onReasonChange,
  layout = 'page',
}) {
  const isPage = layout === 'page'

  const inputClass = isPage
    ? 'h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-[var(--studio-primary)] focus:ring-2 focus:ring-[var(--studio-primary)]/15'
    : 'h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]'

  const textareaClass = isPage
    ? 'min-h-[104px] w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-[15px] leading-relaxed text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-[var(--studio-primary)] focus:ring-2 focus:ring-[var(--studio-primary)]/15'
    : 'w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]'

  const sectionTitleClass = 'text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground'
  const panelClass = isPage
    ? 'rounded-2xl border border-border bg-muted/15 p-5 shadow-sm'
    : 'rounded-xl border border-border bg-muted/10 p-4'

  const showFormFields = isWorkflowEventFormSubmission(event)
  const selectedEvent = WORKFLOW_EVENT_OPTIONS.find((opt) => opt.value === event)

  const handleEventSelect = (next) => {
    onEventChange?.(next)
    if (!isWorkflowEventFormSubmission(next)) {
      onFormIDsChange?.([])
      onIsGenericFormChange?.(false)
      onReasonChange?.('')
    }
  }

  return (
    <div className={cn('space-y-5', isPage && 'space-y-6')}>
      <div className={panelClass}>
        <div className={sectionTitleClass}>Workflow identity</div>
        <div className={cn('mt-4 space-y-4', isPage && 'space-y-5')}>
          <div className="space-y-2">
            <FieldLabel required hint="A clear internal name your team will recognize.">
              Workflow name
            </FieldLabel>
            <input
              value={name}
              onChange={(e) => onNameChange?.(e.target.value)}
              placeholder="e.g. Beginner class follow-up"
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <FieldLabel hint="Optional context for admins — not shown to leads.">
              Description
            </FieldLabel>
            <textarea
              value={description}
              onChange={(e) => onDescriptionChange?.(e.target.value)}
              placeholder="What does this workflow do? Who is it for?"
              rows={isPage ? 3 : 3}
              className={textareaClass}
            />
          </div>
        </div>
      </div>

      <div className={panelClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className={sectionTitleClass}>Trigger</div>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Choose what starts this workflow. Form-specific options appear when needed.
            </p>
          </div>
          {selectedEvent && (
            <span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[12px] font-semibold text-primary">
              {selectedEvent.label}
            </span>
          )}
        </div>

        {isPage ? (
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {WORKFLOW_EVENT_OPTIONS.map((opt) => {
              const meta = EVENT_META[opt.value] || EVENT_META.non
              const Icon = meta.icon
              const selected = event === opt.value

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleEventSelect(opt.value)}
                  className={cn(
                    'group flex h-full flex-col rounded-xl border p-4 text-left transition-all',
                    selected
                      ? 'border-primary/40 bg-primary/5 shadow-sm ring-2 ring-primary/15'
                      : 'border-border bg-background hover:border-primary/25 hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                        selected
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-foreground">{opt.label}</div>
                      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                        {meta.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        ) : null}

        {isPage && !event && (
          <p className="mt-3 text-[12px] font-medium text-amber-700 dark:text-amber-300">
            Select a trigger event to continue.
          </p>
        )}

        {!isPage ? (
          <div className="mt-4 space-y-2">
            <FieldLabel required>Trigger event</FieldLabel>
            <select
              value={event}
              onChange={(e) => handleEventSelect(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Select event…
              </option>
              {WORKFLOW_EVENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {showFormFields && (
          <div
            className={cn(
              'mt-5 rounded-xl border border-primary/20 bg-primary/[0.04] p-4',
              isPage && 'p-5'
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-foreground">Apply to all forms</div>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  When enabled, every form submission triggers this workflow. Turn off to pick specific
                  forms only.
                </p>
              </div>
              <Switch
                checked={isGenericForm}
                onCheckedChange={(checked) => onIsGenericFormChange?.(checked)}
                aria-label="Apply to all forms"
              />
            </div>

            {!isGenericForm && (
              <div className="mt-4 space-y-2 border-t border-primary/10 pt-4">
                <FieldLabel required hint="Only submissions from these forms will start the workflow.">
                  Forms
                </FieldLabel>
                <WorkflowFormMultiSelect
                  values={formIDs}
                  onChange={onFormIDsChange}
                  forms={forms}
                  loading={formsLoading}
                  compact={!isPage}
                  placeholder="Select one or more forms…"
                />
              </div>
            )}

            <div className="mt-4 space-y-2 border-t border-primary/10 pt-4">
              <FieldLabel hint="Optional category used for reporting and filtering.">
                Reason
              </FieldLabel>
              <select
                value={reason}
                onChange={(e) => onReasonChange?.(e.target.value)}
                disabled={reasonsLoading}
                className={cn(inputClass, reasonsLoading && 'opacity-60')}
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
        )}
      </div>
    </div>
  )
}
