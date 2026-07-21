'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Zap } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const inputClass =
  'w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus:border-[var(--studio-primary)] focus:ring-2 focus:ring-[var(--studio-primary)]/15 disabled:opacity-60'

const CONDITION_TYPES = {
  CURRENT_STAGE_IS: 'current_stage_is',
  CURRENT_STAGE_IS_NOT: 'current_stage_is_not',
  DAYS_SINCE_CREATED: 'days_since_created',
  DAYS_SINCE_LAST_ACTIVITY: 'days_since_last_activity',
  EVENT_OCCURRED: 'event_occurred',
  EVENT_NOT_OCCURRED: 'event_not_occurred',
  PACKAGE_COUNT_GTE: 'package_count_gte',
}

const ACTION = {
  SET_STAGE: 'set_stage',
  SET_STAGE_TIER: 'set_stage_tier',
}

function emptyCondition(catalog) {
  const types = (catalog?.conditions || []).map((c) => c.type)
  const preferred = CONDITION_TYPES.EVENT_OCCURRED
  const first = types.includes(preferred) ? preferred : types[0] || preferred
  return blankCondition(first)
}

function blankCondition(type) {
  switch (type) {
    case CONDITION_TYPES.CURRENT_STAGE_IS:
    case CONDITION_TYPES.CURRENT_STAGE_IS_NOT:
      return { type, stageKey: '' }
    case CONDITION_TYPES.DAYS_SINCE_CREATED:
    case CONDITION_TYPES.DAYS_SINCE_LAST_ACTIVITY:
      return { type, days: 30 }
    case CONDITION_TYPES.EVENT_OCCURRED:
    case CONDITION_TYPES.EVENT_NOT_OCCURRED:
      return { type, event: 'inbound_reply' }
    case CONDITION_TYPES.PACKAGE_COUNT_GTE:
      return { type, count: 1 }
    default:
      return { type }
  }
}

function emptyTier(statuses) {
  return {
    gte: 1000,
    stageKey: statuses.find((s) => s.isActive !== false)?.key || '',
  }
}

function createEmptyForm(statuses = []) {
  return {
    name: '',
    description: '',
    isActive: true,
    logic: 'AND',
    ruleKind: 'simple',
    conditions: [],
    actionStageKey: statuses.find((s) => s.isActive !== false)?.key || '',
    metric: 'total_spend',
    tiers: [emptyTier(statuses), { gte: 5000, stageKey: '' }, { gte: 10000, stageKey: '' }],
  }
}

function formFromRule(rule, statuses) {
  if (!rule) return createEmptyForm(statuses)
  const isTier = rule.action?.type === ACTION.SET_STAGE_TIER
  return {
    name: rule.name || '',
    description: rule.description || '',
    isActive: rule.isActive !== false,
    logic: rule.logic === 'OR' ? 'OR' : 'AND',
    ruleKind: isTier ? 'tier' : 'simple',
    conditions: Array.isArray(rule.conditions) ? rule.conditions.map((c) => ({ ...c })) : [],
    actionStageKey: rule.action?.stageKey || statuses?.[0]?.key || '',
    metric: rule.action?.metric || 'total_spend',
    tiers:
      isTier && Array.isArray(rule.action?.tiers) && rule.action.tiers.length
        ? rule.action.tiers.map((t) => ({ gte: t.gte, stageKey: t.stageKey }))
        : [emptyTier(statuses)],
  }
}

function statusName(statuses, key) {
  return statuses.find((s) => s.key === key)?.name || key || '…'
}

function eventLabel(events, key) {
  return events.find((e) => e.key === key)?.label || String(key || '').replace(/_/g, ' ')
}

function metricLabel(metrics, key) {
  return metrics.find((m) => m.key === key)?.label || key
}

function describeCondition(c, statuses, events) {
  switch (c.type) {
    case CONDITION_TYPES.CURRENT_STAGE_IS:
      return `status is ${statusName(statuses, c.stageKey)}`
    case CONDITION_TYPES.CURRENT_STAGE_IS_NOT:
      return `status is not ${statusName(statuses, c.stageKey)}`
    case CONDITION_TYPES.DAYS_SINCE_CREATED:
      return `created ≥ ${c.days ?? '?'} days ago`
    case CONDITION_TYPES.DAYS_SINCE_LAST_ACTIVITY:
      return `no activity for ≥ ${c.days ?? '?'} days`
    case CONDITION_TYPES.EVENT_OCCURRED:
      return eventLabel(events, c.event)
    case CONDITION_TYPES.EVENT_NOT_OCCURRED:
      return `${eventLabel(events, c.event)} has not happened`
    case CONDITION_TYPES.PACKAGE_COUNT_GTE:
      return `package purchases ≥ ${c.count ?? '?'}`
    default:
      return c.type
  }
}

export default function LeadAutomationFormDialog({
  open,
  onClose,
  rule,
  statuses = [],
  onSaved,
}) {
  const isEdit = Boolean(rule?._id || rule?.id)
  const [form, setForm] = useState(() => createEmptyForm(statuses))
  const [catalog, setCatalog] = useState({
    conditions: [],
    events: [],
    tierMetrics: [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError('')

    ;(async () => {
      const res = await api.get('/api/lead-status-automation/catalog')
      const nextCatalog = {
        conditions: Array.isArray(res?.data?.conditions) ? res.data.conditions : [],
        events: Array.isArray(res?.data?.events) ? res.data.events : [],
        tierMetrics: Array.isArray(res?.data?.tierMetrics) ? res.data.tierMetrics : [],
      }
      if (cancelled) return
      setCatalog(nextCatalog)

      const base = formFromRule(rule, statuses)
      if (base.ruleKind === 'simple') {
        if (!base.actionStageKey && statuses.length) {
          base.actionStageKey = statuses.find((s) => s.isActive)?.key || statuses[0].key
        }
        if (!base.conditions.length) {
          base.conditions = [emptyCondition(nextCatalog)]
        }
      } else {
        base.tiers = base.tiers.map((t) => ({
          ...t,
          stageKey: t.stageKey || statuses.find((s) => s.isActive)?.key || '',
        }))
      }
      setForm(base)
    })()

    return () => {
      cancelled = true
    }
  }, [open, rule, statuses])

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const conditions = form.conditions || []
  const tiers = form.tiers || []
  const isTier = form.ruleKind === 'tier'
  const activeStatuses = statuses.filter((s) => s.isActive !== false)

  const addCondition = () => {
    setForm((prev) => ({
      ...prev,
      conditions: [...prev.conditions, emptyCondition(catalog)],
    }))
  }

  const updateCondition = (index, patch) => {
    setForm((prev) => {
      const next = prev.conditions.map((c, i) => {
        if (i !== index) return c
        if (patch.type && patch.type !== c.type) return blankCondition(patch.type)
        return { ...c, ...patch }
      })
      return { ...prev, conditions: next }
    })
  }

  const removeCondition = (index) => {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }))
  }

  const addTier = () => {
    setForm((prev) => ({
      ...prev,
      tiers: [...prev.tiers, emptyTier(activeStatuses)],
    }))
  }

  const updateTier = (index, patch) => {
    setForm((prev) => ({
      ...prev,
      tiers: prev.tiers.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    }))
  }

  const removeTier = (index) => {
    setForm((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index),
    }))
  }

  const plainEnglish = useMemo(() => {
    if (isTier) {
      const valid = tiers.filter((t) => t.stageKey && Number.isFinite(Number(t.gte)))
      if (!valid.length) return null
      const sorted = [...valid].sort((a, b) => Number(b.gte) - Number(a.gte))
      const metric = metricLabel(catalog.tierMetrics, form.metric)
      const ladder = sorted
        .map((t) => `≥ ${t.gte} → ${statusName(statuses, t.stageKey)}`)
        .join(', then ')
      const gates =
        conditions.length > 0
          ? `If ${conditions.map((c) => describeCondition(c, statuses, catalog.events)).join(form.logic === 'OR' ? ', or ' : ', and ')}, then by ${metric}: ${ladder}.`
          : `By ${metric}: ${ladder}.`
      return gates
    }

    if (!conditions.length || !form.actionStageKey) return null
    const parts = conditions.map((c) => describeCondition(c, statuses, catalog.events))
    const joiner = form.logic === 'OR' ? ', or ' : ', and '
    return `If ${parts.join(joiner)} → set status to ${statusName(statuses, form.actionStageKey)}.`
  }, [
    isTier,
    tiers,
    conditions,
    form.logic,
    form.actionStageKey,
    form.metric,
    statuses,
    catalog.events,
    catalog.tierMetrics,
  ])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Rule name is required')
      return
    }

    if (isTier) {
      const validTiers = tiers.filter((t) => t.stageKey && Number(t.gte) >= 0)
      if (validTiers.length < 1) {
        setError('Add at least one tier with a threshold and status')
        return
      }
    } else {
      if (!form.actionStageKey) {
        setError('Pick a target status')
        return
      }
      if (!conditions.length) {
        setError('Add at least one condition')
        return
      }
      for (const c of conditions) {
        if (
          (c.type === CONDITION_TYPES.CURRENT_STAGE_IS ||
            c.type === CONDITION_TYPES.CURRENT_STAGE_IS_NOT) &&
          !c.stageKey
        ) {
          setError('Select a status for each status condition')
          return
        }
        if (
          (c.type === CONDITION_TYPES.EVENT_OCCURRED ||
            c.type === CONDITION_TYPES.EVENT_NOT_OCCURRED) &&
          !c.event
        ) {
          setError('Select an event for each event condition')
          return
        }
      }
    }

    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      isActive: form.isActive,
      logic: form.logic === 'OR' ? 'OR' : 'AND',
      conditions: isTier ? conditions : conditions,
      action: isTier
        ? {
            type: ACTION.SET_STAGE_TIER,
            metric: form.metric,
            tiers: tiers
              .filter((t) => t.stageKey && Number.isFinite(Number(t.gte)))
              .map((t) => ({ gte: Number(t.gte), stageKey: t.stageKey })),
          }
        : { type: ACTION.SET_STAGE, stageKey: form.actionStageKey },
    }

    const id = rule?._id || rule?.id
    const res = isEdit
      ? await api.patch(`/api/lead-status-automation/${id}`, payload)
      : await api.post('/api/lead-status-automation', payload)

    if (res?.success) {
      onSaved?.({ isEdit })
      onClose()
    } else {
      setError(res?.error || 'Failed to save automation')
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xl">
      <DialogContent onClose={saving ? undefined : onClose} className="max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 border-b border-border bg-card px-6 pb-4 pt-6">
          <DialogHeader>
            <DialogTitle className="text-[22px]">
              {isEdit ? 'Edit automation' : 'New automation'}
            </DialogTitle>
            <DialogDescription className="text-[14px]">
              Simple rules set one status. Tier ladders pick a status from a measurable count
              (spend, packages, lessons booked/cancelled, etc.) — highest match wins.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
              {error}
            </div>
          )}

          <section className="space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              1. Basics
            </h3>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-foreground">
                  Rule name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder={
                    isTier ? 'e.g. Customer spend tiers' : 'e.g. Mark dormant after 100 days'
                  }
                  disabled={saving}
                  autoFocus={!isEdit}
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2 pb-0.5 text-[13px] text-muted-foreground">
                <span
                  className={cn(
                    'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                    form.isActive ? 'bg-emerald-500' : 'bg-muted'
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={form.isActive}
                    disabled={saving}
                    onChange={(e) => set('isActive', e.target.checked)}
                  />
                  <span
                    className={cn(
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
                      form.isActive ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </span>
                Active
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-foreground">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Optional"
                disabled={saving}
                className={inputClass}
              />
            </div>

            <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
              {[
                { value: 'simple', label: 'Simple status change' },
                { value: 'tier', label: 'Tier ladder' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('ruleKind', opt.value)}
                  disabled={saving}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition',
                    form.ruleKind === opt.value
                      ? 'bg-[var(--studio-primary)] text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {!isTier && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    2. When (conditions)
                  </h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    Pick conditions the product can detect.
                  </p>
                </div>
                {conditions.length > 1 && (
                  <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
                    {[
                      { value: 'AND', label: 'All must match' },
                      { value: 'OR', label: 'Any one' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => set('logic', opt.value)}
                        disabled={saving}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-[12px] font-semibold transition',
                          form.logic === opt.value
                            ? 'bg-[var(--studio-primary)] text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <ConditionRows
                conditions={conditions}
                catalog={catalog}
                activeStatuses={activeStatuses}
                saving={saving}
                logic={form.logic}
                onUpdate={updateCondition}
                onRemove={removeCondition}
                canRemove={conditions.length > 1}
              />

              <button
                type="button"
                onClick={addCondition}
                disabled={saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-[12px] font-semibold text-foreground hover:bg-muted/40 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add condition
              </button>

              <div className="space-y-1.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  3. Then set status to
                </h3>
                <select
                  value={form.actionStageKey}
                  onChange={(e) => set('actionStageKey', e.target.value)}
                  disabled={saving}
                  className={inputClass}
                >
                  <option value="">Select status…</option>
                  {activeStatuses.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>
          )}

          {isTier && (
            <section className="space-y-4">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  2. Measure
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  We check the highest threshold first (e.g. Diamond before Gold before Silver).
                </p>
              </div>

              <select
                value={form.metric}
                onChange={(e) => set('metric', e.target.value)}
                disabled={saving}
                className={inputClass}
              >
                {(catalog.tierMetrics.length
                  ? catalog.tierMetrics
                  : [
                      { key: 'total_spend', label: 'Total amount spent ($)' },
                      { key: 'package_count', label: 'Package purchases' },
                      { key: 'lessons_booked', label: 'Lessons booked' },
                      { key: 'lessons_completed', label: 'Lessons completed' },
                      { key: 'lessons_cancelled', label: 'Lessons cancelled' },
                      { key: 'lessons_no_show', label: 'Lesson no-shows' },
                    ]
                ).map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
              {catalog.tierMetrics.find((m) => m.key === form.metric)?.description ? (
                <p className="text-[12px] text-muted-foreground">
                  {catalog.tierMetrics.find((m) => m.key === form.metric).description}
                </p>
              ) : null}

              <div className="space-y-2">
                {tiers.map((tier, index) => (
                  <div
                    key={`tier-${index}`}
                    className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3"
                  >
                    <span className="text-[12px] font-semibold text-muted-foreground">If ≥</span>
                    <input
                      type="number"
                      min={0}
                      value={tier.gte}
                      onChange={(e) => updateTier(index, { gte: Number(e.target.value) })}
                      disabled={saving}
                      className="h-10 w-28 rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus:border-[var(--studio-primary)]"
                    />
                    <span className="text-[12px] font-semibold text-muted-foreground">→</span>
                    <select
                      value={tier.stageKey}
                      onChange={(e) => updateTier(index, { stageKey: e.target.value })}
                      disabled={saving}
                      className="h-10 min-w-[160px] flex-1 rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus:border-[var(--studio-primary)]"
                    >
                      <option value="">Select status…</option>
                      {activeStatuses.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeTier(index)}
                      disabled={saving || tiers.length <= 1}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addTier}
                disabled={saving}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-[12px] font-semibold text-foreground hover:bg-muted/40"
              >
                <Plus className="h-3.5 w-3.5" />
                Add tier
              </button>

              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Optional gates
                </h3>
                <p className="text-[13px] text-muted-foreground">
                  Extra filters (e.g. current status is Converted). Leave empty to always apply the
                  ladder when spend/packages change.
                </p>
                <ConditionRows
                  conditions={conditions}
                  catalog={catalog}
                  activeStatuses={activeStatuses}
                  saving={saving}
                  logic={form.logic}
                  onUpdate={updateCondition}
                  onRemove={removeCondition}
                  canRemove
                />
                <button
                  type="button"
                  onClick={addCondition}
                  disabled={saving}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-background px-3 text-[12px] font-semibold text-foreground hover:bg-muted/40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add gate condition
                </button>
              </div>
            </section>
          )}

          {plainEnglish && (
            <div className="flex gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100">
              <Zap className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-300" />
              <p>
                <span className="font-semibold">In plain English: </span>
                {plainEnglish}
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 border-t border-border pt-4 sm:gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-5 text-[14px] font-medium text-foreground hover:bg-muted/40 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--studio-primary)] px-6 text-[14px] font-semibold text-white hover:brightness-95 disabled:opacity-60"
            >
              {saving ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save rule' : 'Create rule'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ConditionRows({
  conditions,
  catalog,
  activeStatuses,
  saving,
  logic,
  onUpdate,
  onRemove,
  canRemove,
}) {
  if (!conditions.length) return null

  return (
    <div className="space-y-2">
      {conditions.map((cond, index) => (
        <div key={`cond-${index}`} className="rounded-2xl border border-border bg-card p-3 shadow-sm">
          {index > 0 && (
            <div className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {logic === 'OR' ? 'or' : 'and'}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={cond.type}
              onChange={(e) => onUpdate(index, { type: e.target.value })}
              disabled={saving}
              className="h-10 min-w-[200px] rounded-xl border border-border bg-background px-3 text-[13px] font-medium text-foreground outline-none focus:border-[var(--studio-primary)]"
            >
              {(catalog.conditions.length
                ? catalog.conditions
                : [{ type: CONDITION_TYPES.EVENT_OCCURRED, label: 'Event has happened' }]
              ).map((c) => (
                <option key={c.type} value={c.type}>
                  {c.label}
                </option>
              ))}
            </select>

            {(cond.type === CONDITION_TYPES.CURRENT_STAGE_IS ||
              cond.type === CONDITION_TYPES.CURRENT_STAGE_IS_NOT) && (
              <select
                value={cond.stageKey || ''}
                onChange={(e) => onUpdate(index, { stageKey: e.target.value })}
                disabled={saving}
                className="h-10 min-w-[160px] flex-1 rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus:border-[var(--studio-primary)]"
              >
                <option value="">Select status…</option>
                {activeStatuses.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {(cond.type === CONDITION_TYPES.DAYS_SINCE_CREATED ||
              cond.type === CONDITION_TYPES.DAYS_SINCE_LAST_ACTIVITY) && (
              <input
                type="number"
                min={0}
                value={cond.days ?? ''}
                onChange={(e) => onUpdate(index, { days: Number(e.target.value) })}
                disabled={saving}
                className="h-10 w-28 rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus:border-[var(--studio-primary)]"
              />
            )}

            {(cond.type === CONDITION_TYPES.EVENT_OCCURRED ||
              cond.type === CONDITION_TYPES.EVENT_NOT_OCCURRED) && (
              <select
                value={cond.event || ''}
                onChange={(e) => onUpdate(index, { event: e.target.value })}
                disabled={saving}
                className="h-10 min-w-[200px] flex-1 rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus:border-[var(--studio-primary)]"
              >
                {(catalog.events || []).map((ev) => (
                  <option key={ev.key} value={ev.key}>
                    {ev.label}
                    {ev.wired ? ' ✓' : ''}
                  </option>
                ))}
              </select>
            )}

            {cond.type === CONDITION_TYPES.PACKAGE_COUNT_GTE && (
              <input
                type="number"
                min={1}
                value={cond.count ?? ''}
                onChange={(e) => onUpdate(index, { count: Number(e.target.value) })}
                disabled={saving}
                className="h-10 w-28 rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus:border-[var(--studio-primary)]"
              />
            )}

            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={saving || canRemove === false}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
