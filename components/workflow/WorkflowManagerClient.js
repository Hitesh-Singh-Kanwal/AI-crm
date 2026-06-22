'use client'

import { Plus, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import WorkflowCard from '@/components/workflow/WorkflowCard'
import ConfirmDeleteWorkflowDialog from '@/components/workflow/ConfirmDeleteWorkflowDialog'
import { buildDuplicateWorkflowPayload } from '@/lib/workflow-normalize'

export default function WorkflowManagerClient({ detailPathBase = '/ai-automation/workflows' }) {
  const builderHref = `${detailPathBase}/builder`

  const [workflows, setWorkflows] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState('')
  const [listSuccessMsg, setListSuccessMsg] = useState('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState(null)

  const loadWorkflows = async () => {
    setLoadingList(true)
    setListError('')
    const res = await api.get('/api/workflow/')
    if (res?.success) {
      const list = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.workflows)
        ? res.data.workflows
        : []
      setWorkflows(list)
    } else {
      setListError(res?.error || 'Failed to load workflows.')
    }
    setLoadingList(false)
  }

  useEffect(() => {
    loadWorkflows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const requestDelete = (id) => {
    const wf = workflows.find((w) => (w?._id || w?.id) === id)
    setDeleteTarget({ id, name: wf?.name || '' })
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    const id = deleteTarget?.id
    if (!id || deleting) return
    setDeleting(true)
    setListError('')
    const res = await api.delete(`/api/workflow/${id}`)
    if (res?.success) {
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
      await loadWorkflows()
    } else {
      setListError(res?.error || 'Failed to delete workflow.')
    }
    setDeleting(false)
  }

  const duplicateWorkflow = async (id) => {
    if (!id || duplicatingId) return
    setDuplicatingId(id)
    setListError('')
    setListSuccessMsg('')

    const fetchRes = await api.get(`/api/workflow/${id}`)
    if (!fetchRes?.success) {
      setListError(fetchRes?.error || 'Failed to load workflow to duplicate.')
      setDuplicatingId(null)
      return
    }

    const payload = buildDuplicateWorkflowPayload(fetchRes.data)
    if (!payload) {
      setListError('Could not prepare duplicate workflow.')
      setDuplicatingId(null)
      return
    }

    const res = await api.post('/api/workflow/', payload)
    if (res?.success) {
      await loadWorkflows()
      setListSuccessMsg(
        `"${payload.name}" was created as inactive. Open it in the builder to review, then activate when ready.`
      )
    } else {
      setListError(res?.error || 'Failed to duplicate workflow.')
    }

    setDuplicatingId(null)
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 text-[16px]">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-bold text-foreground">Workflows</h2>
            <p className="text-[15px] text-muted-foreground">
              Automate follow-ups with timed SMS, email, and call steps tied to lead stages.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden text-[15px] text-muted-foreground sm:inline">{workflows.length} total</span>
            <button
              type="button"
              onClick={() => {
                setListSuccessMsg('')
                loadWorkflows()
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-[14px] font-semibold text-foreground hover:bg-muted/40"
            >
              <RefreshCw className={cn('h-4 w-4', loadingList && 'animate-spin')} />
              Refresh
            </button>
            <Link
              href={builderHref}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--studio-primary)] px-4 text-[14px] font-semibold text-white hover:brightness-95"
            >
              <Plus className="h-4 w-4" />
              New workflow
            </Link>
          </div>
        </div>

        {listSuccessMsg && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-700 dark:text-emerald-300">
            {listSuccessMsg}
          </div>
        )}

        {listError && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
            {listError}
          </div>
        )}

        <div className="mt-4">
          {loadingList ? (
            <div className="rounded-xl border border-border bg-muted/40 px-4 py-8 text-center text-[13px] text-muted-foreground">
              Loading…
            </div>
          ) : workflows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-12 text-center">
              <p className="text-[14px] text-muted-foreground">
                No workflows yet. Build your first automation visually.
              </p>
              <Link
                href={builderHref}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--studio-primary)] px-4 text-[14px] font-semibold text-white hover:brightness-95"
              >
                <Plus className="h-4 w-4" />
                New workflow
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workflows.map((wf) => (
                <WorkflowCard
                  key={wf?._id || wf?.id}
                  workflow={wf}
                  onDelete={requestDelete}
                  onDuplicate={duplicateWorkflow}
                  duplicating={duplicatingId === (wf?._id || wf?.id)}
                  detailPathBase={detailPathBase}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDeleteWorkflowDialog
        open={deleteDialogOpen}
        busy={deleting}
        workflowName={deleteTarget?.name}
        onClose={() => {
          if (deleting) return
          setDeleteDialogOpen(false)
          setDeleteTarget(null)
        }}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
