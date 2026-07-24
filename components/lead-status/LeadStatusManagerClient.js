'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Layers, Pencil, Plus, RefreshCw, Trash2, Users, Zap } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import { invalidateLeadStagesCache } from '@/lib/lead-stages'
import LeadStatusFormDialog from '@/components/lead-status/LeadStatusFormDialog'
import LeadAutomationFormDialog from '@/components/lead-status/LeadAutomationFormDialog'
import CustomerAutomationFormDialog from '@/components/lead-status/CustomerAutomationFormDialog'
import ConfirmDeleteLeadStatusDialog from '@/components/lead-status/ConfirmDeleteLeadStatusDialog'
import ConfirmDeleteLeadAutomationDialog from '@/components/lead-status/ConfirmDeleteLeadAutomationDialog'

const ENTITY_TABS = [
  { value: 'lead', label: 'Leads', icon: Layers },
  { value: 'customer', label: 'Customers', icon: Users },
]

function activeBadge(isActive) {
  return isActive
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : 'bg-muted text-muted-foreground'
}

function lifecycleBadge(status) {
  if (status === 'inactive') {
    return 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
  }
  if (status === 'archived') {
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300'
  }
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
}

function lifecycleLabel(status) {
  if (status === 'inactive') return 'Inactive'
  if (status === 'archived') return 'Archived'
  if (status === 'active') return 'Active'
  return '—'
}

function summarizeLeadRule(rule, statuses) {
  const target =
    statuses.find((s) => s.key === rule.action?.stageKey)?.name || rule.action?.stageKey || '—'
  const conditions = Array.isArray(rule.conditions) ? rule.conditions : []
  const n = conditions.length
  const hasJoins = conditions.some((c, i) => i > 0 && (c.join === 'AND' || c.join === 'OR'))
  const hasOr = hasJoins
    ? conditions.some((c, i) => i > 0 && c.join === 'OR')
    : rule.logic === 'OR'
  const hasAnd = hasJoins
    ? conditions.some((c, i) => i > 0 && c.join !== 'OR')
    : rule.logic !== 'OR'
  const logic = hasOr && hasAnd ? 'mixed' : hasOr ? 'OR' : 'AND'
  return { target, n, logic }
}

function summarizeCustomerRule(rule) {
  const target = lifecycleLabel(rule.action?.status)
  const conditions = Array.isArray(rule.conditions) ? rule.conditions : []
  const n = conditions.length
  const hasJoins = conditions.some((c, i) => i > 0 && (c.join === 'AND' || c.join === 'OR'))
  const hasOr = hasJoins
    ? conditions.some((c, i) => i > 0 && c.join === 'OR')
    : rule.logic === 'OR'
  const hasAnd = hasJoins
    ? conditions.some((c, i) => i > 0 && c.join !== 'OR')
    : rule.logic !== 'OR'
  const logic = hasOr && hasAnd ? 'mixed' : hasOr ? 'OR' : 'AND'
  return { target, n, logic }
}

function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-[14px] font-semibold text-foreground">{title}</p>
        <p className="max-w-sm text-[13px] text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

export default function LeadStatusManagerClient() {
  const [entityType, setEntityType] = useState('lead')

  const [statuses, setStatuses] = useState([])
  const [automations, setAutomations] = useState([])
  const [customerAutomations, setCustomerAutomations] = useState([])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingStatus, setEditingStatus] = useState(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const [autoFormOpen, setAutoFormOpen] = useState(false)
  const [editingAuto, setEditingAuto] = useState(null)

  const [deleteAutoOpen, setDeleteAutoOpen] = useState(false)
  const [deleteAutoTarget, setDeleteAutoTarget] = useState(null)
  const [deletingAuto, setDeletingAuto] = useState(false)

  const [custAutoFormOpen, setCustAutoFormOpen] = useState(false)
  const [editingCustAuto, setEditingCustAuto] = useState(null)

  const [deleteCustAutoOpen, setDeleteCustAutoOpen] = useState(false)
  const [deleteCustAutoTarget, setDeleteCustAutoTarget] = useState(null)
  const [deletingCustAuto, setDeletingCustAuto] = useState(false)

  const loadStatuses = useCallback(async () => {
    const res = await api.get('/api/lead-status')
    if (res?.success) {
      setStatuses(Array.isArray(res.data) ? res.data : [])
      return null
    }
    setStatuses([])
    return res?.error || 'Failed to load lead stages.'
  }, [])

  const loadAutomations = useCallback(async () => {
    const res = await api.get('/api/lead-status-automation')
    if (res?.success) {
      setAutomations(Array.isArray(res.data) ? res.data : [])
      return null
    }
    setAutomations([])
    return res?.error || 'Failed to load lead automations.'
  }, [])

  const loadCustomerAutomations = useCallback(async () => {
    const res = await api.get('/api/customer-lifecycle-automation')
    if (res?.success) {
      setCustomerAutomations(Array.isArray(res.data) ? res.data : [])
      return null
    }
    setCustomerAutomations([])
    return res?.error || 'Failed to load customer automations.'
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    const [statusErr, autoErr, custAutoErr] = await Promise.all([
      loadStatuses(),
      loadAutomations(),
      loadCustomerAutomations(),
    ])
    setError(statusErr || autoErr || custAutoErr || '')
    setLoading(false)
  }, [loadStatuses, loadAutomations, loadCustomerAutomations])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const leadStats = useMemo(() => {
    const activeStages = statuses.filter((s) => s.isActive).length
    const activeRules = automations.filter((a) => a.isActive).length
    return {
      stages: statuses.length,
      activeStages,
      rules: automations.length,
      activeRules,
    }
  }, [statuses, automations])

  const customerStats = useMemo(() => {
    const activeRules = customerAutomations.filter((a) => a.isActive).length
    return {
      rules: customerAutomations.length,
      activeRules,
      inactiveRules: customerAutomations.length - activeRules,
    }
  }, [customerAutomations])

  const openCreateStatus = () => {
    setEditingStatus(null)
    setFormOpen(true)
  }
  const openEditStatus = (status) => {
    setEditingStatus(status)
    setFormOpen(true)
  }
  const handleStatusSaved = ({ isEdit }) => {
    invalidateLeadStagesCache()
    toast.success(isEdit ? 'Lead stage updated' : 'Lead stage created')
    loadStatuses()
  }
  const requestDeleteStatus = (status) => {
    setDeleteTarget({ id: status._id || status.id, name: status.name })
    setDeleteOpen(true)
  }
  const confirmDeleteStatus = async () => {
    const id = deleteTarget?.id
    if (!id || deleting) return
    setDeleting(true)
    const res = await api.delete(`/api/lead-status/${id}`)
    if (res?.success) {
      invalidateLeadStagesCache()
      toast.success('Lead stage deleted')
      setDeleteOpen(false)
      setDeleteTarget(null)
      await loadStatuses()
    } else {
      setError(res?.error || 'Failed to delete lead stage.')
    }
    setDeleting(false)
  }

  const openCreateAuto = () => {
    setEditingAuto(null)
    setAutoFormOpen(true)
  }
  const openEditAuto = (rule) => {
    setEditingAuto(rule)
    setAutoFormOpen(true)
  }
  const handleAutoSaved = ({ isEdit }) => {
    toast.success(isEdit ? 'Lead automation updated' : 'Lead automation created')
    loadAutomations()
  }
  const requestDeleteAuto = (rule) => {
    setDeleteAutoTarget({ id: rule._id || rule.id, name: rule.name })
    setDeleteAutoOpen(true)
  }
  const confirmDeleteAuto = async () => {
    const id = deleteAutoTarget?.id
    if (!id || deletingAuto) return
    setDeletingAuto(true)
    const res = await api.delete(`/api/lead-status-automation/${id}`)
    if (res?.success) {
      toast.success('Lead automation deleted')
      setDeleteAutoOpen(false)
      setDeleteAutoTarget(null)
      await loadAutomations()
    } else {
      setError(res?.error || 'Failed to delete lead automation.')
    }
    setDeletingAuto(false)
  }

  const openCreateCustAuto = () => {
    setEditingCustAuto(null)
    setCustAutoFormOpen(true)
  }
  const openEditCustAuto = (rule) => {
    setEditingCustAuto(rule)
    setCustAutoFormOpen(true)
  }
  const handleCustAutoSaved = ({ isEdit }) => {
    toast.success(isEdit ? 'Customer automation updated' : 'Customer automation created')
    loadCustomerAutomations()
  }
  const requestDeleteCustAuto = (rule) => {
    setDeleteCustAutoTarget({ id: rule._id || rule.id, name: rule.name })
    setDeleteCustAutoOpen(true)
  }
  const confirmDeleteCustAuto = async () => {
    const id = deleteCustAutoTarget?.id
    if (!id || deletingCustAuto) return
    setDeletingCustAuto(true)
    const res = await api.delete(`/api/customer-lifecycle-automation/${id}`)
    if (res?.success) {
      toast.success('Customer automation deleted')
      setDeleteCustAutoOpen(false)
      setDeleteCustAutoTarget(null)
      await loadCustomerAutomations()
    } else {
      setError(res?.error || 'Failed to delete customer automation.')
    }
    setDeletingCustAuto(false)
  }

  const isLead = entityType === 'lead'

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 text-[16px]">
      {/* Stats — context-aware per tab */}
      {isLead ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Stages</div>
            <div className="mt-2 text-3xl font-bold text-foreground">{leadStats.stages}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Active stages</div>
            <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {leadStats.activeStages}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Automations on</div>
            <div className="mt-2 text-3xl font-bold text-foreground">
              {leadStats.activeRules}
              <span className="ml-1.5 text-lg font-medium text-muted-foreground">
                / {leadStats.rules}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Rules</div>
            <div className="mt-2 text-3xl font-bold text-foreground">{customerStats.rules}</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Active rules</div>
            <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {customerStats.activeRules}
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Lifecycle</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-md bg-emerald-100 px-2 py-1 text-[12px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Active
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="inline-flex rounded-md bg-rose-100 px-2 py-1 text-[12px] font-semibold text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                Inactive
              </span>
              <span className="text-muted-foreground">/</span>
              <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[12px] font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                Archived
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main card with entity tabs */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-bold text-foreground">
              {isLead ? 'Lead Stages & Automations' : 'Customer Lifecycle'}
            </h2>
            <p className="mt-1 max-w-2xl text-[15px] text-muted-foreground">
              {isLead
                ? 'Customize pipeline stages, then set rules that move leads automatically.'
                : 'Customers are Active, Inactive, or Archived. Rules flip that status from real activity — payments, sessions, memberships, and more.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-border bg-background p-1">
              {ENTITY_TABS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEntityType(value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition',
                    entityType === value
                      ? 'bg-[var(--studio-primary)] text-white'
                      : 'text-muted-foreground hover:bg-muted/40'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={loadAll}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-[14px] font-semibold text-foreground hover:bg-muted/40"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
            {error}
          </div>
        )}

        {/* ─── LEAD TAB ─── */}
        {isLead && (
          <div className="mt-6 space-y-6">
            {/* Stages */}
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">Stages</h3>
                  <p className="text-[13px] text-muted-foreground">
                    Labels for your pipeline. Automations move leads between them.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateStatus}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--studio-primary)] px-3.5 text-[13px] font-semibold text-white hover:brightness-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add stage
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-left text-[13px]">
                  <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Stage</th>
                      <th className="px-4 py-3 font-semibold">Key</th>
                      <th className="px-4 py-3 font-semibold">Description</th>
                      <th className="px-4 py-3 font-semibold">State</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                          Loading stages…
                        </td>
                      </tr>
                    ) : statuses.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <EmptyState
                            icon={Layers}
                            title="No lead stages yet"
                            description="Add stages like New, Engaged, or Converted to build your pipeline."
                            action={
                              <button
                                type="button"
                                onClick={openCreateStatus}
                                className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--studio-primary)] px-3.5 text-[13px] font-semibold text-white hover:brightness-95"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add stage
                              </button>
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      statuses.map((status) => {
                        const id = status._id || status.id
                        return (
                          <tr
                            key={id}
                            className="border-b border-border/70 align-top transition-colors hover:bg-muted/20"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="inline-block h-3 w-3 flex-shrink-0 rounded-full"
                                  style={{ background: status.color || '#6B7280' }}
                                />
                                <span className="font-semibold text-foreground">{status.name}</span>
                                {status.isDefault && (
                                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                    default
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                                {status.key}
                              </code>
                            </td>
                            <td className="max-w-[280px] px-4 py-3 text-[12px] text-muted-foreground">
                              {status.description || <span className="italic">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  'inline-flex rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                                  activeBadge(status.isActive)
                                )}
                              >
                                {status.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditStatus(status)}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] font-medium text-foreground hover:bg-muted/40"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                                {!status.isDefault && (
                                  <button
                                    type="button"
                                    onClick={() => requestDeleteStatus(status)}
                                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#EF4444] px-2 text-[11px] font-medium text-white hover:bg-[#DC2626]"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Lead automations */}
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-semibold text-foreground">Automations</h3>
                  <p className="text-[13px] text-muted-foreground">
                    IF conditions match → set lead stage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateAuto}
                  disabled={!statuses.length}
                  title={!statuses.length ? 'Add a stage first' : undefined}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--studio-primary)] px-3.5 text-[13px] font-semibold text-white hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add rule
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-left text-[13px]">
                  <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Rule</th>
                      <th className="px-4 py-3 font-semibold">Conditions</th>
                      <th className="px-4 py-3 font-semibold">Sets stage</th>
                      <th className="px-4 py-3 font-semibold">State</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                          Loading automations…
                        </td>
                      </tr>
                    ) : automations.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <EmptyState
                            icon={Zap}
                            title="No lead automations yet"
                            description='Try a rule like “New + no activity for 100 days → Dormant”.'
                            action={
                              statuses.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={openCreateAuto}
                                  className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--studio-primary)] px-3.5 text-[13px] font-semibold text-white hover:brightness-95"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add rule
                                </button>
                              ) : null
                            }
                          />
                        </td>
                      </tr>
                    ) : (
                      automations.map((rule) => {
                        const id = rule._id || rule.id
                        const summary = summarizeLeadRule(rule, statuses)
                        const stageMeta = statuses.find((s) => s.key === rule.action?.stageKey)
                        return (
                          <tr
                            key={id}
                            className="border-b border-border/70 align-top transition-colors hover:bg-muted/20"
                          >
                            <td className="px-4 py-3">
                              <div className="font-semibold text-foreground">{rule.name}</div>
                              {rule.description ? (
                                <div className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
                                  {rule.description}
                                </div>
                              ) : null}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                                <Zap className="h-2.5 w-2.5" />
                                {`${summary.n} ${summary.logic}`}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {stageMeta?.color ? (
                                  <span
                                    className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                    style={{ background: stageMeta.color }}
                                  />
                                ) : null}
                                <span className="font-medium text-foreground">{summary.target}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  'inline-flex rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                                  activeBadge(rule.isActive)
                                )}
                              >
                                {rule.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditAuto(rule)}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] font-medium text-foreground hover:bg-muted/40"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => requestDeleteAuto(rule)}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#EF4444] px-2 text-[11px] font-medium text-white hover:bg-[#DC2626]"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* ─── CUSTOMER TAB ─── */}
        {!isLead && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-semibold text-foreground">Automations</h3>
                <p className="text-[13px] text-muted-foreground">
                  IF conditions match → mark customer Active, Inactive, or Archived.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateCustAuto}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--studio-primary)] px-3.5 text-[13px] font-semibold text-white hover:brightness-95"
              >
                <Plus className="h-3.5 w-3.5" />
                Add rule
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-left text-[13px]">
                <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Rule</th>
                    <th className="px-4 py-3 font-semibold">Conditions</th>
                    <th className="px-4 py-3 font-semibold">Marks as</th>
                    <th className="px-4 py-3 font-semibold">State</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                        Loading automations…
                      </td>
                    </tr>
                  ) : customerAutomations.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState
                          icon={Users}
                          title="No customer automations yet"
                          description='Try “No session for 90 days + no active membership → Inactive”.'
                          action={
                            <button
                              type="button"
                              onClick={openCreateCustAuto}
                              className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--studio-primary)] px-3.5 text-[13px] font-semibold text-white hover:brightness-95"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add rule
                            </button>
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    customerAutomations.map((rule) => {
                      const id = rule._id || rule.id
                      const summary = summarizeCustomerRule(rule)
                      return (
                        <tr
                          key={id}
                          className="border-b border-border/70 align-top transition-colors hover:bg-muted/20"
                        >
                          <td className="px-4 py-3">
                            <div className="font-semibold text-foreground">{rule.name}</div>
                            {rule.description ? (
                              <div className="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">
                                {rule.description}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                              <Zap className="h-2.5 w-2.5" />
                              {`${summary.n} ${summary.logic}`}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                                lifecycleBadge(rule.action?.status)
                              )}
                            >
                              {summary.target}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                                activeBadge(rule.isActive)
                              )}
                            >
                              {rule.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditCustAuto(rule)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border px-2 text-[11px] font-medium text-foreground hover:bg-muted/40"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => requestDeleteCustAuto(rule)}
                                className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#EF4444] px-2 text-[11px] font-medium text-white hover:bg-[#DC2626]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <LeadStatusFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false)
          setEditingStatus(null)
        }}
        status={editingStatus}
        onSaved={handleStatusSaved}
      />

      <LeadAutomationFormDialog
        open={autoFormOpen}
        onClose={() => {
          setAutoFormOpen(false)
          setEditingAuto(null)
        }}
        rule={editingAuto}
        statuses={statuses}
        onSaved={handleAutoSaved}
      />

      <CustomerAutomationFormDialog
        open={custAutoFormOpen}
        onClose={() => {
          setCustAutoFormOpen(false)
          setEditingCustAuto(null)
        }}
        rule={editingCustAuto}
        onSaved={handleCustAutoSaved}
      />

      <ConfirmDeleteLeadStatusDialog
        open={deleteOpen}
        busy={deleting}
        statusName={deleteTarget?.name}
        onClose={() => {
          if (deleting) return
          setDeleteOpen(false)
          setDeleteTarget(null)
        }}
        onConfirm={confirmDeleteStatus}
      />

      <ConfirmDeleteLeadAutomationDialog
        open={deleteAutoOpen}
        busy={deletingAuto}
        ruleName={deleteAutoTarget?.name}
        entity="lead"
        onClose={() => {
          if (deletingAuto) return
          setDeleteAutoOpen(false)
          setDeleteAutoTarget(null)
        }}
        onConfirm={confirmDeleteAuto}
      />

      <ConfirmDeleteLeadAutomationDialog
        open={deleteCustAutoOpen}
        busy={deletingCustAuto}
        ruleName={deleteCustAutoTarget?.name}
        entity="customer"
        onClose={() => {
          if (deletingCustAuto) return
          setDeleteCustAutoOpen(false)
          setDeleteCustAutoTarget(null)
        }}
        onConfirm={confirmDeleteCustAuto}
      />
    </div>
  )
}
