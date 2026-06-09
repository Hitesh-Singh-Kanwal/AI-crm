'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import WorkflowDiagram from '@/components/workflow/WorkflowDiagram'
import {
  WORKFLOW_EVENT_OPTIONS,
  createInitialStepsByDay,
  normalizeWorkflowForPatch,
  normalizeWorkflowFromApi,
  validateWorkflowMeta,
  validateWorkflowSteps,
} from '@/lib/workflow-normalize'
import WorkflowMetaFields from '@/components/workflow/WorkflowMetaFields'
import WorkflowStepsBuilder from '@/components/workflow/WorkflowStepsBuilder'
import { useWorkflowOptions } from '@/lib/useWorkflowOptions'
import ConfirmDeleteWorkflowDialog from '@/components/workflow/ConfirmDeleteWorkflowDialog'

const LEAD_STAGE_OPTIONS = [
  'new',
  'engaged',
  'cold',
  'booked',
  'actualized',
  'no show',
  'qualified',
  'disqualified',
  'human intervention',
]

export default function WorkflowDetailsClient({ id, listHref = '/ai-automation/workflows' }) {
  const router = useRouter()
  const [workflow, setWorkflow] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const { forms, reasons, formsLoading, reasonsLoading, optionsError } = useWorkflowOptions(true)

  const linkedFormNames = useMemo(() => {
    const ids = workflow?.formIDs ?? (workflow?.formID ? [workflow.formID] : [])
    if (!Array.isArray(ids) || ids.length === 0) {
      if (workflow?.isGenericForm) return ['All forms']
      return []
    }
    return ids
      .map((fid) => {
        const match = forms.find((f) => String(f?._id || f?.id) === String(fid))
        return match?.name || fid
      })
      .filter(Boolean)
  }, [workflow, forms])

  const linkedReasonName = useMemo(() => {
    const code = workflow?.reason
    if (!code) return ''
    const match = reasons.find((r) => (r?.reasonCode || r?.name) === code)
    return match?.name || code
  }, [workflow?.reason, reasons])

  const load = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    const res = await api.get(`/api/workflow/${id}`)
    if (res?.success) {
      setWorkflow(normalizeWorkflowFromApi(res?.data) || null)
    } else {
      setError(res?.error || 'Failed to load workflow.')
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const startEdit = () => {
    const wf = normalizeWorkflowFromApi(workflow) || workflow
    setDraft({
      _id: wf?._id || wf?.id || id,
      name: wf?.name ?? '',
      description: wf?.description ?? '',
      event: wf?.event ?? 'non',
      formID: wf?.formIDs ?? [],
      isGenericForm: Boolean(wf?.isGenericForm),
      reason: wf?.reason ?? '',
      stepsByDay: wf?.stepsByDay?.length ? wf.stepsByDay.map((g) => g.map((s) => ({ ...s }))) : createInitialStepsByDay(),
    })
    setEditing(true)
    setSaveError('')
  }

  const canSave = useMemo(() => {
    if (!draft) return false
    return (
      validateWorkflowMeta({
        name: draft.name,
        event: draft.event,
        formIDs: draft.formID,
        isGenericForm: draft.isGenericForm,
        reason: draft.reason,
      }) && validateWorkflowSteps(draft.stepsByDay)
    )
  }, [draft])

  const save = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setSaveError('')
    const payload = normalizeWorkflowForPatch(draft)
    const res = await api.patch(`/api/workflow/${id}`, payload)
    if (res?.success) {
      setEditing(false)
      setDraft(null)
      await load()
    } else {
      setSaveError(res?.error || 'Failed to update workflow.')
    }
    setSaving(false)
  }

  const del = async () => {
    if (deleting) return
    setDeleting(true)
    const res = await api.delete(`/api/workflow/${id}`)
    if (res?.success) {
      router.push(listHref)
    } else {
      setError(res?.error || 'Failed to delete workflow.')
      setDeleting(false)
    }
  }

  return (
    <MainLayout title="Workflow" subtitle="Workflow details">
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={listHref}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-[13px] font-medium text-foreground hover:bg-muted/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <button
            type="button"
            onClick={load}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-[13px] font-medium text-foreground hover:bg-muted/40"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-12 text-center text-[13px] text-muted-foreground">
            Loading…
          </div>
        ) : workflow ? (
          <>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-[20px] font-bold text-foreground">{workflow?.name || '—'}</h2>
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    Event:{' '}
                    {WORKFLOW_EVENT_OPTIONS.find((o) => o.value === workflow?.event)?.label || workflow?.event || '—'}
                  </p>
                  <p className="mt-2 text-[13px] text-muted-foreground">{workflow?.description || '—'}</p>
                  {(linkedFormNames.length > 0 || linkedReasonName) && (
                    <p className="mt-2 text-[12px] text-muted-foreground">
                      {linkedFormNames.length > 0 ? `Forms: ${linkedFormNames.join(', ')}` : ''}
                      {linkedFormNames.length > 0 && linkedReasonName ? ' · ' : ''}
                      {linkedReasonName ? `Reason: ${linkedReasonName}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={startEdit}
                    className="inline-flex h-10 items-center rounded-xl bg-[var(--studio-primary)] px-4 text-[13px] font-medium text-white hover:brightness-95"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 text-[13px] font-medium text-destructive hover:bg-destructive/15"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <WorkflowDiagram workflow={workflow} />
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-12 text-center text-[13px] text-muted-foreground">
            Not found.
          </div>
        )}

        {editing && draft && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-border bg-card shadow-xl">
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border p-6">
                <div>
                  <h3 className="text-[18px] font-bold text-foreground">Edit workflow</h3>
                  <p className="text-[12px] text-muted-foreground">Update trigger settings and day-by-day sequence.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setDraft(null)
                  }}
                  className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-[12px] font-medium text-foreground hover:bg-muted/40"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-foreground">Name</label>
                    <input
                      value={draft.name}
                      onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                      className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-foreground">Trigger event</label>
                    <select
                      value={draft.event}
                      onChange={(e) => {
                        const next = e.target.value
                        setDraft((p) => ({
                          ...p,
                          event: next,
                          ...(next !== 'form_submission'
                            ? { formID: [], isGenericForm: false, reason: '' }
                            : {}),
                        }))
                      }}
                      className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                    >
                      {WORKFLOW_EVENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <WorkflowMetaFields
                    compact
                    event={draft.event}
                    formIDs={draft.formID ?? []}
                    isGenericForm={Boolean(draft.isGenericForm)}
                    reason={draft.reason ?? ''}
                    forms={forms}
                    reasons={reasons}
                    formsLoading={formsLoading}
                    reasonsLoading={reasonsLoading}
                    onFormIDsChange={(value) => setDraft((p) => ({ ...p, formID: value }))}
                    onIsGenericFormChange={(value) => setDraft((p) => ({ ...p, isGenericForm: value }))}
                    onReasonChange={(value) => setDraft((p) => ({ ...p, reason: value }))}
                  />
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[13px] font-medium text-foreground">Description</label>
                    <textarea
                      value={draft.description}
                      onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                    />
                  </div>
                </div>

                {optionsError && (
                  <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-800 dark:text-amber-200">
                    {optionsError}
                  </div>
                )}

                <div className="mt-6">
                  <div className="text-[14px] font-semibold text-foreground">Sequence</div>
                  <div className="text-[12px] text-muted-foreground">
                    Steps on the same day run in parallel.
                  </div>
                  <div className="mt-4">
                    <WorkflowStepsBuilder
                      compact
                      stepsByDay={draft.stepsByDay}
                      onChange={(next) => setDraft((p) => ({ ...p, stepsByDay: next }))}
                      leadStageOptions={LEAD_STAGE_OPTIONS}
                    />
                  </div>
                </div>

                {saveError && (
                  <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
                    {saveError}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border p-6">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setDraft(null)
                  }}
                  className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-[15px] font-medium text-foreground hover:bg-muted/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!canSave || saving}
                  className={cn(
                    'inline-flex h-11 items-center rounded-lg bg-[var(--studio-primary)] px-5 text-[15px] font-medium text-white hover:brightness-95',
                    (!canSave || saving) && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmDeleteWorkflowDialog
          open={deleteOpen}
          busy={deleting}
          workflowName={workflow?.name}
          onClose={() => {
            if (deleting) return
            setDeleteOpen(false)
          }}
          onConfirm={del}
        />
      </div>
    </MainLayout>
  )
}
