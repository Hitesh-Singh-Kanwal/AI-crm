'use client'

import { Clock3, Mail, MessageSquare, Phone } from 'lucide-react'
import { flattenWorkflowSteps } from '@/lib/workflow-normalize'

function StepIcon({ type }) {
  const Icon = type === 'call' ? Phone : type === 'email' ? Mail : MessageSquare
  return <Icon className="h-4 w-4 text-muted-foreground" />
}

function DownArrow() {
  return (
    <div className="flex items-center justify-center py-2 text-muted-foreground">
      <svg width="16" height="34" viewBox="0 0 16 34" fill="none" aria-hidden="true">
        <path d="M8 0V28" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" />
        <path
          d="M2 26L8 32L14 26"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

function normalizeSteps(workflow) {
  const steps = flattenWorkflowSteps(workflow?.steps)
  const normalized = steps.map((s, idx) => ({
    ...s,
    _idx: idx,
    _orderNum: Number.parseInt(String(s.order ?? ''), 10),
  }))
  normalized.sort((a, b) => {
    const aValid = Number.isFinite(a._orderNum)
    const bValid = Number.isFinite(b._orderNum)
    if (aValid && bValid && a._orderNum !== b._orderNum) return a._orderNum - b._orderNum
    return a._idx - b._idx
  })
  return normalized
}

export default function WorkflowDiagram({ workflow, title = 'Workflow Diagram', subtitle = 'Vertical preview of the workflow.' }) {
  const normalized = normalizeSteps(workflow)

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-foreground">{title}</h3>
          <p className="text-[12px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-[12px] font-semibold text-foreground">{workflow?.name || '—'}</div>
          <div className="text-[11px] text-muted-foreground">Event: {workflow?.event || '—'}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-col items-stretch">
        <div className="rounded-xl border border-border bg-background p-4">
          <div className="text-[11px] font-semibold text-muted-foreground">TRIGGER</div>
          <div className="mt-2 text-[13px] font-semibold text-foreground">{workflow?.event || '—'}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">Starts the workflow</div>
        </div>

        {normalized.length > 0 ? <DownArrow /> : null}

        {normalized.map((step, i) => (
          <div key={`${step.order}-${step._idx}`} className="flex flex-col">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-muted-foreground">STEP {step.order}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <StepIcon type={step.type} />
                    <div className="text-[13px] font-semibold text-foreground">{String(step.type || '').toUpperCase()}</div>
                  </div>
                </div>
                {step.day !== undefined && (
                  <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    Day {Number(step.day ?? 0)}
                  </div>
                )}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="rounded-lg border border-border bg-card px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">Lead Stage</div>
                  <div className="mt-0.5 text-[12px] font-medium text-foreground">{step.leadStage || '—'}</div>
                </div>
                <div className="rounded-lg border border-border bg-card px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">Description</div>
                  <div className="mt-0.5 text-[12px] font-medium text-foreground">{step.description?.trim() ? step.description : '—'}</div>
                </div>
              </div>
            </div>

            {i < normalized.length - 1 && <DownArrow />}
          </div>
        ))}

        {normalized.length === 0 && (
          <div className="mt-2 rounded-xl border border-border bg-muted/40 px-4 py-8 text-center text-[13px] text-muted-foreground">
            No steps
          </div>
        )}
      </div>
    </div>
  )
}

