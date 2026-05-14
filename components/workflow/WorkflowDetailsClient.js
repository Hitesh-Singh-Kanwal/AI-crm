'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, RefreshCw, Trash2 } from 'lucide-react'
import MainLayout from '@/components/layout/MainLayout'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import WorkflowDiagram from '@/components/workflow/WorkflowDiagram'
import { normalizeWorkflowFromApi } from '@/lib/workflow-normalize'
import ConfirmDeleteWorkflowDialog from '@/components/workflow/ConfirmDeleteWorkflowDialog'

const STEP_TYPES = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'call', label: 'Call' },
]

const EVENT_OPTIONS = ['non', 'form_submission', 'lead_updated', 'lead_moved_stage', 'custom_event']

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

function createEmptyStep(order) {
  return {
    type: 'sms',
    description: '',
    order: String(order),
    leadStage: 'new',
  }
}

function normalizeWorkflowForPatch(workflow) {
  const steps = Array.isArray(workflow?.steps) ? workflow.steps : []
  return {
    name: String(workflow?.name ?? ''),
    description: String(workflow?.description ?? ''),
    event: String(workflow?.event ?? ''),
    steps: steps.map((s) => {
      const base = {
        type: s.type,
        description: s.description ?? '',
        order: String(s.order ?? ''),
        leadStage: String(s.leadStage ?? ''),
      }
      const dayNum = Number(s.day)
      if (Number.isFinite(dayNum)) return { ...base, day: dayNum }
      return base
    }),
  }
}

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
    const base = {
      _id: wf?._id || wf?.id || id,
      name: wf?.name ?? '',
      description: wf?.description ?? '',
      event: wf?.event ?? 'non',
      steps: Array.isArray(wf?.steps) ? wf.steps.map((s) => ({ ...s })) : [createEmptyStep(1)],
    }
    if (!Array.isArray(base.steps) || base.steps.length === 0) base.steps = [createEmptyStep(1)]
    base.steps = base.steps.map((s, idx) => ({
      type: s.type || 'sms',
      description: s.description ?? '',
      order: String(s.order ?? String(idx + 1)),
      leadStage: s.leadStage || 'new',
      ...(s.day !== undefined ? { day: s.day } : {}),
    }))
    setDraft(base)
    setEditing(true)
    setSaveError('')
  }

  const canSave = useMemo(() => {
    if (!draft) return false
    if (!draft.name?.trim()) return false
    if (!draft.event?.trim()) return false
    if (!Array.isArray(draft.steps) || draft.steps.length === 0) return false
    return draft.steps.every((s) => s.type && s.order !== '' && s.leadStage !== '')
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
      <div className="mx-auto w-full max-w-4xl space-y-4">
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
                  <p className="mt-1 text-[12px] text-muted-foreground">Event: {workflow?.event || '—'}</p>
                  <p className="mt-2 text-[13px] text-muted-foreground">{workflow?.description || '—'}</p>
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
            <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-bold text-foreground">Edit Workflow</h3>
                  <p className="text-[12px] text-muted-foreground">
                    Update fields below, then save changes.
                  </p>
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

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-foreground">Name</label>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-foreground">Event</label>
                  <select
                    value={draft.event}
                    onChange={(e) => setDraft((p) => ({ ...p, event: e.target.value }))}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                  >
                    {EVENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
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

              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[14px] font-semibold text-foreground">Steps</div>
                  <div className="text-[12px] text-muted-foreground">Update steps then save.</div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setDraft((p) => ({ ...p, steps: [...p.steps, createEmptyStep(p.steps.length + 1)] }))
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-[13px] font-medium text-foreground hover:bg-muted/40"
                >
                  <Plus className="h-4 w-4" />
                  Add Step
                </button>
              </div>

              <div className="mt-3 max-h-[40vh] space-y-3 overflow-y-auto pr-1">
                {draft.steps.map((step, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-[13px] font-semibold text-foreground">Step {idx + 1}</div>
                      <button
                        type="button"
                        onClick={() => setDraft((p) => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }))}
                        disabled={draft.steps.length === 1}
                        className={cn(
                          'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted/40',
                          draft.steps.length === 1 && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                      <div>
                        <label className="mb-1 block text-[11px] text-muted-foreground">Type</label>
                        <select
                          value={step.type}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              steps: p.steps.map((s, i) => (i === idx ? { ...s, type: e.target.value } : s)),
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                        >
                          {STEP_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-muted-foreground">Order</label>
                        <input
                          value={step.order}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              steps: p.steps.map((s, i) => (i === idx ? { ...s, order: e.target.value } : s)),
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-muted-foreground">Lead Stage</label>
                        <select
                          value={step.leadStage}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              steps: p.steps.map((s, i) =>
                                i === idx ? { ...s, leadStage: e.target.value } : s
                              ),
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                        >
                          {LEAD_STAGE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-muted-foreground">Description</label>
                        <input
                          value={step.description}
                          onChange={(e) =>
                            setDraft((p) => ({
                              ...p,
                              steps: p.steps.map((s, i) =>
                                i === idx ? { ...s, description: e.target.value } : s
                              ),
                            }))
                          }
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {saveError && (
                <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
                  {saveError}
                </div>
              )}

              <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
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
                  {saving ? 'Saving…' : 'Save Changes'}
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

