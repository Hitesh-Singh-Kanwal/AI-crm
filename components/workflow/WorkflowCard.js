'use client'

import Link from 'next/link'
import { Copy, Loader2, Pencil, Trash2, Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'
import { flattenWorkflowSteps, normalizeWorkflowListIdFromApi, normalizeWorkflowListNameFromApi } from '@/lib/workflow-normalize'
import { formatReasonLabel } from '@/lib/dynamic-list-normalize'

export default function WorkflowCard({
  workflow,
  onDelete,
  onDuplicate,
  duplicating = false,
  detailPathBase = '/ai-automation/workflows',
}) {
  const id = workflow?._id || workflow?.id
  const flatSteps = flattenWorkflowSteps(workflow?.steps)
  const stepsCount = flatSteps.length || workflow?.stepsCount || 0
  const listID = normalizeWorkflowListIdFromApi(workflow)
  const listName = normalizeWorkflowListNameFromApi(workflow) || workflow?.listName || ''
  const triggerLabel = listID
    ? `List: ${listName || 'Dynamic list'} · ${formatReasonLabel(workflow?.reason)}`
    : `Event: ${workflow?.event || '—'}`

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
            {triggerLabel} • {stepsCount} steps
          </p>
          {workflow?.description && (
            <p className="mt-2 line-clamp-2 text-[12px] text-muted-foreground">{workflow.description}</p>
          )}
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
          <Link
            href={`${detailPathBase}/builder?id=${id}`}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-border bg-background text-[11px] font-medium text-muted-foreground hover:bg-muted/50"
          >
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            Open
          </Link>
          <button
            type="button"
            onClick={() => onDuplicate?.(id)}
            disabled={duplicating}
            className={cn(
              'inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-border bg-background text-[11px] font-medium text-foreground hover:bg-muted/50',
              duplicating && 'cursor-not-allowed opacity-60'
            )}
          >
            {duplicating ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5 shrink-0" />
            )}
            {duplicating ? 'Copying…' : 'Duplicate'}
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(id)}
            disabled={duplicating}
            className={cn(
              'inline-flex h-9 items-center justify-center gap-1 rounded-xl bg-[#EF4444] text-[11px] font-medium text-white hover:bg-[#DC2626]',
              duplicating && 'cursor-not-allowed opacity-60'
            )}
          >
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}

