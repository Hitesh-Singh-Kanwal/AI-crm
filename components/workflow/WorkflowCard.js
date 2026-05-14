'use client'

import Link from 'next/link'
import { Eye, Trash2, Workflow } from 'lucide-react'
import { flattenWorkflowSteps } from '@/lib/workflow-normalize'

export default function WorkflowCard({ workflow, onDelete, detailPathBase = '/ai-automation/workflows' }) {
  const id = workflow?._id || workflow?.id
  const flatSteps = flattenWorkflowSteps(workflow?.steps)
  const stepsCount = flatSteps.length || workflow?.stepsCount || 0

  return (
    <article className="h-[220px] w-full rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="inline-flex h-6 items-center rounded-bl-md rounded-tr-md bg-primary/10 px-2.5 text-[10px] font-medium text-primary">
            Workflow
          </span>
        </div>

        <div className="mt-3">
          <h3 className="truncate text-[18px] font-semibold leading-7 text-foreground">{workflow?.name || '—'}</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Event: {workflow?.event || '—'} • {stepsCount} steps
          </p>
          {workflow?.description && (
            <p className="mt-2 line-clamp-2 text-[12px] text-muted-foreground">{workflow.description}</p>
          )}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-3 pt-4">
          <Link
            href={`${detailPathBase}/${id}`}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-background text-[12px] font-medium text-muted-foreground hover:bg-muted/50"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </Link>
          <button
            type="button"
            onClick={() => onDelete?.(id)}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#EF4444] text-[12px] font-medium text-white hover:bg-[#DC2626]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}

