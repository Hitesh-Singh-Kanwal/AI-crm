'use client'

import { Clock3, Mail, MessageSquare, Phone } from 'lucide-react'
import {
  isCallStepType,
  normalizeWorkflowStepFromApi,
  stepsByDayFromApi,
} from '@/lib/workflow-normalize'

function StepIcon({ type }) {
  const Icon = isCallStepType(type) ? Phone : type === 'email' ? Mail : MessageSquare
  return <Icon className="h-4 w-4 text-muted-foreground" />
}

function formatStepTime(step) {
  const h = String(step.hour ?? 0).padStart(2, '0')
  const m = String(step.minute ?? 0).padStart(2, '0')
  return `${h}:${m}`
}

function dayLabel(day) {
  if (day === 0) return 'Day 0 — Immediately'
  if (day === 1) return 'Day 1'
  return `Day ${day}`
}

function normalizeGroupedSteps(workflow) {
  const groups = stepsByDayFromApi(workflow?.steps ?? workflow?.stepsByDay)
  return groups.map((daySteps, groupIdx) => {
    const day = daySteps[0]?.day ?? groupIdx
    const normalized = daySteps.map((s, idx) => ({
      ...normalizeWorkflowStepFromApi({ ...s, day }, idx),
      _idx: idx,
    }))
    return { day, steps: normalized }
  })
}

function formSummary(workflow) {
  if (workflow?.isGenericForm) return 'All forms'
  const ids = workflow?.formIDs ?? workflow?.formID
  if (Array.isArray(ids) && ids.length > 0) return `${ids.length} form${ids.length === 1 ? '' : 's'}`
  if (ids) return 'Form set'
  return ''
}

export default function WorkflowDiagram({
  workflow,
  title = 'Workflow preview',
  subtitle = 'Timeline grouped by day — steps on the same day run in parallel.',
}) {
  const dayGroups = normalizeGroupedSteps(workflow)
  const formInfo = formSummary(workflow)

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-foreground">{title}</h3>
          <p className="text-[12px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-[12px] font-semibold text-foreground">{workflow?.name || '—'}</div>
          <div className="text-[11px] text-muted-foreground">Event: {workflow?.event || '—'}</div>
          {(formInfo || workflow?.reason) && (
            <div className="text-[11px] text-muted-foreground">
              {formInfo}
              {formInfo && workflow?.reason ? ' · ' : ''}
              {workflow?.reason ? `Reason: ${workflow.reason}` : ''}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="text-[10px] font-bold uppercase tracking-wide text-primary">Trigger</div>
          <div className="mt-1 text-[14px] font-semibold text-foreground">{workflow?.event || '—'}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">Starts the workflow</div>
        </div>

        {dayGroups.length === 0 ? (
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-8 text-center text-[13px] text-muted-foreground">
            No steps configured
          </div>
        ) : (
          dayGroups.map((group, groupIdx) => (
            <div
              key={`day-group-${group.day}-${groupIdx}`}
              className={groupIdx > 0 ? 'flex gap-4 border-t border-border pt-5' : 'flex gap-4'}
            >
              <div className="flex w-28 shrink-0 flex-col items-center pt-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border bg-background text-[12px] font-bold text-foreground">
                  {group.day}
                </div>
                {groupIdx < dayGroups.length - 1 && (
                  <div className="mt-2 w-px flex-1 min-h-[24px] bg-border" aria-hidden="true" />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-2 pb-2">
                <div className="text-[12px] font-semibold text-muted-foreground">{dayLabel(group.day)}</div>
                <div className="flex flex-wrap gap-3">
                  {group.steps.map((step) => (
                    <div
                      key={`${group.day}-${step._idx}`}
                      className="w-full max-w-sm rounded-xl border border-border bg-background p-3"
                    >
                      <div className="mb-2 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Step {step._idx + 1}
                      </div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <StepIcon type={step.type} />
                          <div>
                            <div className="text-[12px] font-semibold text-foreground">
                              {String(step.type || '').replace(/([A-Z])/g, ' $1').trim().toUpperCase()}
                            </div>
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2 py-1 text-[10px] text-muted-foreground">
                          <Clock3 className="h-3 w-3" />
                          {formatStepTime(step)}
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-md border border-border bg-card px-2 py-1.5">
                          <div className="text-[9px] text-muted-foreground">Lead stage</div>
                          <div className="text-[11px] font-medium text-foreground">{step.leadStage || '—'}</div>
                        </div>
                        <div className="rounded-md border border-border bg-card px-2 py-1.5">
                          <div className="text-[9px] text-muted-foreground">Description</div>
                          <div className="truncate text-[11px] font-medium text-foreground">
                            {step.description?.trim() ? step.description : '—'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
