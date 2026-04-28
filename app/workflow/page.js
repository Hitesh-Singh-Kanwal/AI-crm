'use client'

import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import WorkflowDiagram from '@/components/workflow/WorkflowDiagram'
import WorkflowCard from '@/components/workflow/WorkflowCard'
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
    day: 0,
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
      // Some APIs include "day" (create example) while PATCH sample omits it.
      // Only send it when present/finite.
      const dayNum = Number(s.day)
      if (Number.isFinite(dayNum)) {
        return { ...base, day: dayNum }
      }
      return base
    }),
  }
}

export default function WorkflowCreatePage() {
  const [view, setView] = useState('list') // 'list' | 'create'
  const [workflows, setWorkflows] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, name } | null
  const [deleting, setDeleting] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [event, setEvent] = useState('')
  const [steps, setSteps] = useState([createEmptyStep(1)])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [createdWorkflow, setCreatedWorkflow] = useState(null)

  const [editing, setEditing] = useState(null) // workflow | null
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  const loadWorkflows = async () => {
    setLoadingList(true)
    setListError('')
    const res = await api.get('/api/workflow/')
    if (res?.success) {
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.data?.workflows) ? res.data.workflows : []
      setWorkflows(list)
    } else {
      setListError(res?.error || 'Failed to load workflows.')
    }
    setLoadingList(false)
  }

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

  const startEdit = (wf) => {
    if (!wf) return
    setEditError('')
    const base = {
      _id: wf._id || wf.id,
      name: wf.name ?? '',
      description: wf.description ?? '',
      event: wf.event ?? '',
      steps: Array.isArray(wf.steps) ? wf.steps.map((s) => ({ ...s })) : [createEmptyStep(1)],
    }
    if (!Array.isArray(base.steps) || base.steps.length === 0) base.steps = [createEmptyStep(1)]
    base.steps = base.steps.map((s, idx) => ({
      type: s.type || 'sms',
      description: s.description ?? '',
      order: String(s.order ?? String(idx + 1)),
      leadStage: s.leadStage || 'new',
      ...(s.day !== undefined ? { day: s.day } : {}),
    }))
    setEditing(base)
  }

  const saveEdit = async () => {
    if (!editing?._id) return
    setSavingEdit(true)
    setEditError('')
    const payload = normalizeWorkflowForPatch(editing)
    const res = await api.patch(`/api/workflow/${editing._id}`, payload)
    if (res?.success) {
      setEditing(null)
      await loadWorkflows()
    } else {
      setEditError(res?.error || 'Failed to update workflow.')
    }
    setSavingEdit(false)
  }

  useEffect(() => {
    loadWorkflows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false
    if (!event.trim()) return false
    if (!Array.isArray(steps) || steps.length === 0) return false
    return steps.every((s) => s.type && s.order !== '' && s.leadStage !== '' && Number.isFinite(Number(s.day)))
  }, [name, event, steps])

  const addStep = () => {
    setSteps((prev) => [...prev, createEmptyStep(prev.length + 1)])
  }

  const removeStep = (idx) => {
    setSteps((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateStep = (idx, patch) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)))
  }

  const submit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError('')
    setSuccessMsg('')
    setCreatedWorkflow(null)

    const payload = {
      name: name.trim(),
      description: description,
      event: event.trim(),
      steps: steps.map((s) => ({
        type: s.type,
        description: s.description ?? '',
        order: String(s.order ?? ''),
        leadStage: String(s.leadStage ?? ''),
        day: Number(s.day ?? 0),
      })),
    }

    const res = await api.post('/api/workflow/', payload)
    if (res?.success) {
      setSuccessMsg(res?.message || 'Workflow created successfully.')
      setCreatedWorkflow(res?.data || payload)
      setName('')
      setDescription('')
      setEvent('')
      setSteps([createEmptyStep(1)])
      setView('list')
      await loadWorkflows()
    } else {
      setError(res?.error || 'Failed to create workflow.')
    }

    setSubmitting(false)
  }

  return (
    <MainLayout title="Workflow" subtitle="Create and manage your workflows">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
          <div className="flex items-center justify-between gap-3 p-2">
            <div className="inline-flex rounded-xl border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'h-9 rounded-lg px-3 text-[13px] font-medium',
                  view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/40'
                )}
              >
                All Workflows
              </button>
              <button
                type="button"
                onClick={() => {
                  setView('create')
                  setSuccessMsg('')
                  setError('')
                }}
                className={cn(
                  'h-9 rounded-lg px-3 text-[13px] font-medium',
                  view === 'create' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/40'
                )}
              >
                Create
              </button>
            </div>

            {view === 'list' && (
              <button
                type="button"
                onClick={loadWorkflows}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-[13px] font-medium text-foreground hover:bg-muted/40"
              >
                <RefreshCw className={cn('h-4 w-4', loadingList && 'animate-spin')} />
                Refresh
              </button>
            )}
          </div>
        </div>

        {view === 'list' ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[18px] font-bold text-foreground">Workflows</h2>
                  <p className="text-[12px] text-muted-foreground">
                    Loaded from <span className="font-mono">GET /api/workflow/</span>
                  </p>
                </div>
                <div className="text-[12px] text-muted-foreground">{workflows.length} total</div>
              </div>

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
                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-8 text-center text-[13px] text-muted-foreground">
                    No workflows found.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {workflows.map((wf) => (
                      <WorkflowCard key={wf?._id || wf?.id} workflow={wf} onDelete={requestDelete} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="flex flex-col gap-1">
                <h2 className="text-[20px] font-bold text-foreground">Create Workflow</h2>
                <p className="text-[12px] text-muted-foreground">
                  This will call <span className="font-mono">POST /api/workflow/</span>
                </p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-foreground">Name *</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="workflow1"
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[14px] font-medium text-foreground">Event *</label>
                  <select
                    value={event}
                    onChange={(e) => setEvent(e.target.value)}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                  >
                    <option value="" disabled>
                      Select event…
                    </option>
                    {EVENT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[14px] font-medium text-foreground">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="workflow created"
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[16px] font-bold text-foreground">Steps</h3>
                  <p className="text-[12px] text-muted-foreground">Add the sequence steps you want to run.</p>
                </div>
                <button
                  type="button"
                  onClick={addStep}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--studio-primary)] px-4 text-[13px] font-medium text-white hover:brightness-95"
                >
                  <Plus className="h-4 w-4" />
                  Add Step
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {steps.map((step, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-semibold text-foreground">Step {idx + 1}</div>
                        <div className="text-[11px] text-muted-foreground">Configure step fields</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        disabled={steps.length === 1}
                        className={cn(
                          'inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted/50',
                          steps.length === 1 && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
                      <div className="md:col-span-1">
                        <label className="mb-1 block text-[11px] text-muted-foreground">Type</label>
                        <select
                          value={step.type}
                          onChange={(e) => updateStep(idx, { type: e.target.value })}
                          className="h-10 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                        >
                          {STEP_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-1">
                        <label className="mb-1 block text-[11px] text-muted-foreground">Order</label>
                        <input
                          value={step.order}
                          onChange={(e) => updateStep(idx, { order: e.target.value })}
                          inputMode="numeric"
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                        />
                      </div>

                      <div className="md:col-span-1">
                        <label className="mb-1 block text-[11px] text-muted-foreground">Lead Stage</label>
                        <select
                          value={step.leadStage}
                          onChange={(e) => updateStep(idx, { leadStage: e.target.value })}
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                        >
                          {LEAD_STAGE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-1">
                        <label className="mb-1 block text-[11px] text-muted-foreground">Day</label>
                        <input
                          value={step.day}
                          onChange={(e) => updateStep(idx, { day: Number(e.target.value) })}
                          type="number"
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                        />
                      </div>

                      <div className="md:col-span-1">
                        <label className="mb-1 block text-[11px] text-muted-foreground">Step Description</label>
                        <input
                          value={step.description}
                          onChange={(e) => updateStep(idx, { description: e.target.value })}
                          placeholder=""
                          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {(error || successMsg) && (
                <div
                  className={cn(
                    'mt-4 rounded-xl border px-4 py-3 text-[13px]',
                    error
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  )}
                  role="status"
                >
                  {error || successMsg}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit || submitting}
                  className={cn(
                    'inline-flex h-11 items-center rounded-lg bg-[var(--studio-primary)] px-5 text-[15px] font-medium text-white hover:brightness-95',
                    (!canSubmit || submitting) && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {submitting ? 'Creating…' : 'Create Workflow'}
                </button>
              </div>
            </div>

            {createdWorkflow && (
              <>
                <WorkflowDiagram workflow={createdWorkflow} title="Workflow Diagram" subtitle="Vertical preview of the created workflow." />
                {createdWorkflow?._id && (
                  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[13px] text-muted-foreground">Open details page to view/edit/delete.</div>
                      <Link
                        href={`/workflow/${createdWorkflow._id}`}
                        className="inline-flex h-10 items-center rounded-xl bg-[var(--studio-primary)] px-4 text-[13px] font-medium text-white hover:brightness-95"
                      >
                        Open Workflow
                      </Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[18px] font-bold text-foreground">Edit Workflow</h3>
                  <p className="text-[12px] text-muted-foreground">
                    This will call <span className="font-mono">PATCH /api/workflow/{editing._id}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-[12px] font-medium text-foreground hover:bg-muted/40"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-foreground">Name</label>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
                    className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-foreground">Event</label>
                  <select
                    value={editing.event}
                    onChange={(e) => setEditing((p) => ({ ...p, event: e.target.value }))}
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
                    value={editing.description}
                    onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))}
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
                    setEditing((p) => ({ ...p, steps: [...p.steps, createEmptyStep(p.steps.length + 1)] }))
                  }
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-border bg-background px-3 text-[13px] font-medium text-foreground hover:bg-muted/40"
                >
                  <Plus className="h-4 w-4" />
                  Add Step
                </button>
              </div>

              <div className="mt-3 max-h-[40vh] space-y-3 overflow-y-auto pr-1">
                {editing.steps.map((step, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-[13px] font-semibold text-foreground">Step {idx + 1}</div>
                      <button
                        type="button"
                        onClick={() =>
                          setEditing((p) => ({ ...p, steps: p.steps.filter((_, i) => i !== idx) }))
                        }
                        disabled={editing.steps.length === 1}
                        className={cn(
                          'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted/40',
                          editing.steps.length === 1 && 'opacity-50 cursor-not-allowed'
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
                            setEditing((p) => ({
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
                            setEditing((p) => ({
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
                            setEditing((p) => ({
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
                            setEditing((p) => ({
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

              {(editError || savingEdit) && (
                <div
                  className={cn(
                    'mt-4 rounded-xl border px-4 py-3 text-[13px]',
                    editError ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-border bg-muted/40 text-muted-foreground'
                  )}
                >
                  {editError || 'Saving…'}
                </div>
              )}

              <div className="mt-5 flex items-center justify-end gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-[15px] font-medium text-foreground hover:bg-muted/40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className={cn(
                    'inline-flex h-11 items-center rounded-lg bg-[var(--studio-primary)] px-5 text-[15px] font-medium text-white hover:brightness-95',
                    savingEdit && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

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
    </MainLayout>
  )
}

