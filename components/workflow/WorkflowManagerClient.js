'use client'

import { GitBranch, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import WorkflowDiagram from '@/components/workflow/WorkflowDiagram'
import WorkflowCard from '@/components/workflow/WorkflowCard'
import ConfirmDeleteWorkflowDialog from '@/components/workflow/ConfirmDeleteWorkflowDialog'
import {
  createInitialStepsByDay,
  normalizeWorkflowForPatch,
  normalizeWorkflowFromApi,
  validateWorkflowMeta,
  validateWorkflowSteps,
} from '@/lib/workflow-normalize'
import WorkflowBasicsSection from '@/components/workflow/WorkflowBasicsSection'
import WorkflowStepsBuilder from '@/components/workflow/WorkflowStepsBuilder'
import { useWorkflowOptions } from '@/lib/useWorkflowOptions'

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

export default function WorkflowManagerClient({ detailPathBase = '/ai-automation/workflows' }) {
  const [view, setView] = useState('list')
  const [workflows, setWorkflows] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [event, setEvent] = useState('')
  const [formIDs, setFormIDs] = useState([])
  const [isGenericForm, setIsGenericForm] = useState(false)
  const [reason, setReason] = useState('')
  const [stepsByDay, setStepsByDay] = useState(createInitialStepsByDay)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [createdWorkflow, setCreatedWorkflow] = useState(null)

  const needsOptions = view === 'create'
  const { forms, reasons, formsLoading, reasonsLoading, optionsError } = useWorkflowOptions(needsOptions)

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

  const resetCreateForm = () => {
    setName('')
    setDescription('')
    setEvent('')
    setFormIDs([])
    setIsGenericForm(false)
    setReason('')
    setStepsByDay(createInitialStepsByDay())
  }

  useEffect(() => {
    loadWorkflows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canSubmit = useMemo(() => {
    return (
      validateWorkflowMeta({ name, event, formIDs, isGenericForm, reason }) &&
      validateWorkflowSteps(stepsByDay)
    )
  }, [name, event, formIDs, isGenericForm, reason, stepsByDay])

  const submit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError('')
    setSuccessMsg('')
    setCreatedWorkflow(null)

    const payload = normalizeWorkflowForPatch({
      name: name.trim(),
      description,
      event: event.trim(),
      formID: formIDs,
      isGenericForm,
      reason,
      stepsByDay,
    })

    const res = await api.post('/api/workflow/', payload)
    if (res?.success) {
      setSuccessMsg(res?.message || 'Workflow created successfully.')
      setCreatedWorkflow(normalizeWorkflowFromApi(res?.data) || { ...payload, ...res?.data })
      resetCreateForm()
      setView('list')
      await loadWorkflows()
    } else {
      setError(res?.error || 'Failed to create workflow.')
    }

    setSubmitting(false)
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 text-[16px]">
      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center justify-between gap-3 p-2">
          <div className="inline-flex rounded-xl border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'h-10 rounded-lg px-4 text-[14px] font-semibold',
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
                'h-10 rounded-lg px-4 text-[14px] font-semibold',
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
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-[14px] font-semibold text-foreground hover:bg-muted/40"
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
                <h2 className="text-[26px] font-bold text-foreground">Workflows</h2>
                <p className="text-[15px] text-muted-foreground">
                  Automate follow-ups with timed SMS, email, and call steps tied to lead stages.
                </p>
              </div>
              <div className="text-[15px] text-muted-foreground">{workflows.length} total</div>
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
                  No workflows found. Create your first workflow to get started.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {workflows.map((wf) => (
                    <WorkflowCard
                      key={wf?._id || wf?.id}
                      workflow={wf}
                      onDelete={requestDelete}
                      detailPathBase={detailPathBase}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-gradient-to-br from-primary/[0.07] via-background to-background px-6 py-7 sm:px-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
                    <GitBranch className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-[26px] font-bold tracking-tight text-foreground sm:text-[28px]">
                      Create workflow
                    </h2>
                    <p className="mt-1 max-w-2xl text-[14px] leading-relaxed text-muted-foreground sm:text-[15px]">
                      Set a trigger, choose forms when needed, then build a day-by-day sequence of
                      actions.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[12px] font-semibold text-primary">
                    1 · Basics
                  </span>
                  <span className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-muted-foreground">
                    2 · Sequence
                  </span>
                </div>
              </div>
            </div>

            <div className="px-6 py-7 sm:px-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[13px] font-bold text-primary">
                  1
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-foreground">Basics</h3>
                  <p className="text-[13px] text-muted-foreground">Name your workflow and define what starts it.</p>
                </div>
              </div>

              <WorkflowBasicsSection
                layout="page"
                name={name}
                description={description}
                event={event}
                formIDs={formIDs}
                isGenericForm={isGenericForm}
                reason={reason}
                forms={forms}
                reasons={reasons}
                formsLoading={formsLoading}
                reasonsLoading={reasonsLoading}
                onNameChange={setName}
                onDescriptionChange={setDescription}
                onEventChange={setEvent}
                onFormIDsChange={setFormIDs}
                onIsGenericFormChange={setIsGenericForm}
                onReasonChange={setReason}
              />

              {optionsError && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-800 dark:text-amber-200">
                  {optionsError}
                </div>
              )}
            </div>

            <div className="border-t border-border bg-muted/[0.12] px-6 py-7 sm:px-8">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-[13px] font-bold text-muted-foreground">
                  2
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-foreground">Sequence</h3>
                  <p className="text-[13px] text-muted-foreground">
                    Each row is a day after the trigger. Add multiple steps on the same day to run them in
                    parallel.
                  </p>
                </div>
              </div>

              <WorkflowStepsBuilder
                stepsByDay={stepsByDay}
                onChange={setStepsByDay}
                leadStageOptions={LEAD_STAGE_OPTIONS}
              />
            </div>

            {(error || successMsg) && (
              <div
                className={cn(
                  'mx-6 mb-2 rounded-xl border px-4 py-3 text-[13px] sm:mx-8',
                  error
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                )}
                role="status"
              >
                {error || successMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-5 sm:px-8">
              <button
                type="button"
                onClick={() => setView('list')}
                className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-[15px] font-medium text-foreground hover:bg-muted/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit || submitting}
                className={cn(
                  'inline-flex h-11 items-center rounded-lg bg-[var(--studio-primary)] px-5 text-[15px] font-medium text-white hover:brightness-95',
                  (!canSubmit || submitting) && 'opacity-60 cursor-not-allowed'
                )}
              >
                {submitting ? 'Creating…' : 'Create workflow'}
              </button>
            </div>
          </div>

          {createdWorkflow && (
            <>
              <WorkflowDiagram workflow={createdWorkflow} />
              {createdWorkflow?._id && (
                <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[13px] text-muted-foreground">Open the details page to view or edit this workflow.</div>
                    <Link
                      href={`${detailPathBase}/${createdWorkflow._id}`}
                      className="inline-flex h-10 items-center rounded-xl bg-[var(--studio-primary)] px-4 text-[13px] font-medium text-white hover:brightness-95"
                    >
                      Open workflow
                    </Link>
                  </div>
                </div>
              )}
            </>
          )}
        </>
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
  )
}
