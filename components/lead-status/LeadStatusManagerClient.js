'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, RefreshCw, Trash2, Zap } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/toast'
import { invalidateLeadStagesCache } from '@/lib/lead-stages'
import LeadStatusFormDialog from '@/components/lead-status/LeadStatusFormDialog'
import LeadAutomationFormDialog from '@/components/lead-status/LeadAutomationFormDialog'
import ConfirmDeleteLeadStatusDialog from '@/components/lead-status/ConfirmDeleteLeadStatusDialog'
import ConfirmDeleteLeadAutomationDialog from '@/components/lead-status/ConfirmDeleteLeadAutomationDialog'

function activeBadge(isActive) {
  return isActive
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    : 'bg-muted text-muted-foreground'
}

function summarizeRule(rule, statuses) {
  if (rule.action?.type === 'set_stage_tier') {
    const tiers = Array.isArray(rule.action.tiers) ? rule.action.tiers : []
    const metricLabels = {
      total_spend: 'spend',
      package_count: 'packages',
      lessons_booked: 'booked',
      lessons_completed: 'completed',
      lessons_cancelled: 'cancelled',
      lessons_no_show: 'no-shows',
    }
    const metric = metricLabels[rule.action.metric] || rule.action.metric || 'metric'
    return {
      kind: 'tier',
      target: `${tiers.length} tiers · ${metric}`,
      n: tiers.length,
      logic: 'TIER',
    }
  }
  const target =
    statuses.find((s) => s.key === rule.action?.stageKey)?.name || rule.action?.stageKey || '—'
  const n = Array.isArray(rule.conditions) ? rule.conditions.length : 0
  const logic = rule.logic === 'OR' ? 'OR' : 'AND'
  return { kind: 'simple', target, n, logic }
}

export default function LeadStatusManagerClient() {
  const [statuses, setStatuses] = useState([])
  const [automations, setAutomations] = useState([])
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

  const loadStatuses = useCallback(async () => {
    const res = await api.get('/api/lead-status')
    if (res?.success) {
      setStatuses(Array.isArray(res.data) ? res.data : [])
      return null
    }
    setStatuses([])
    return res?.error || 'Failed to load lead statuses.'
  }, [])

  const loadAutomations = useCallback(async () => {
    const res = await api.get('/api/lead-status-automation')
    if (res?.success) {
      setAutomations(Array.isArray(res.data) ? res.data : [])
      return null
    }
    setAutomations([])
    return res?.error || 'Failed to load automations.'
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    const [statusErr, autoErr] = await Promise.all([loadStatuses(), loadAutomations()])
    setError(statusErr || autoErr || '')
    setLoading(false)
  }, [loadStatuses, loadAutomations])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const stats = useMemo(() => {
    const active = statuses.filter((s) => s.isActive).length
    const activeRules = automations.filter((a) => a.isActive).length
    return {
      total: statuses.length,
      active,
      automations: automations.length,
      activeRules,
    }
  }, [statuses, automations])

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
    toast.success(isEdit ? 'Lead status updated' : 'Lead status created')
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
      toast.success('Lead status deleted')
      setDeleteOpen(false)
      setDeleteTarget(null)
      await loadStatuses()
    } else {
      setError(res?.error || 'Failed to delete lead status.')
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
    toast.success(isEdit ? 'Automation updated' : 'Automation created')
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
      toast.success('Automation deleted')
      setDeleteAutoOpen(false)
      setDeleteAutoTarget(null)
      await loadAutomations()
    } else {
      setError(res?.error || 'Failed to delete automation.')
    }
    setDeletingAuto(false)
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 text-[16px]">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Statuses</div>
          <div className="mt-2 text-3xl font-bold text-foreground">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Active</div>
          <div className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.active}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Automations</div>
          <div className="mt-2 text-3xl font-bold text-foreground">{stats.automations}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wide text-brand">Rules on</div>
          <div className="mt-2 text-3xl font-bold text-foreground">{stats.activeRules}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
          {error}
        </div>
      )}

      {/* —— Statuses —— */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-bold text-foreground">Lead Statuses</h2>
            <p className="text-[15px] text-muted-foreground">
              Labels for your pipeline. Automations below decide when leads move between them.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadAll}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 text-[14px] font-semibold text-foreground hover:bg-muted/40"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreateStatus}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--studio-primary)] px-4 text-[14px] font-semibold text-white hover:brightness-95"
            >
              <Plus className="h-4 w-4" />
              Add Status
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-[13px]">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Status</th>
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
                    Loading…
                  </td>
                </tr>
              ) : statuses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No lead statuses yet. Add one to get started.
                  </td>
                </tr>
              ) : (
                statuses.map((status) => {
                  const id = status._id || status.id
                  return (
                    <tr key={id} className="border-b border-border/70 align-top">
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
                        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-foreground">
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
      </div>

      {/* —— Automations —— */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[26px] font-bold text-foreground">Automations</h2>
            <p className="text-[15px] text-muted-foreground">
              IF conditions match → set a status. Use a tier ladder for spend/package levels (highest
              match wins).
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateAuto}
            disabled={!statuses.length}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--studio-primary)] px-4 text-[14px] font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Rule
          </button>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-[13px]">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Rule</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Result</th>
                <th className="px-4 py-3 font-semibold">State</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : automations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    No automations yet. Add a simple rule or a spend/package tier ladder.
                  </td>
                </tr>
              ) : (
                automations.map((rule) => {
                  const id = rule._id || rule.id
                  const summary = summarizeRule(rule, statuses)
                  return (
                    <tr key={id} className="border-b border-border/70 align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{rule.name}</div>
                        {rule.description ? (
                          <div className="mt-0.5 text-[12px] text-muted-foreground">
                            {rule.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                          <Zap className="h-2.5 w-2.5" />
                          {summary.kind === 'tier'
                            ? 'Tier ladder'
                            : `${summary.n} ${summary.logic}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{summary.target}</td>
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
        onClose={() => {
          if (deletingAuto) return
          setDeleteAutoOpen(false)
          setDeleteAutoTarget(null)
        }}
        onConfirm={confirmDeleteAuto}
      />
    </div>
  )
}
