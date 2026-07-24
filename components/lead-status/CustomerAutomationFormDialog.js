'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  formatJoinedConditionEnglish,
  hydrateConditionJoins,
  normalizeConditionsForSave,
} from '@/lib/condition-logic'
import { Dialog } from '@/components/ui/dialog'
import {
  ActiveToggle,
  ConditionCard,
  DialogShell,
  FieldLabel,
  FormActions,
  JoinToggle,
  RulePreview,
  StepHeader,
  fieldClass,
  selectClass,
} from '@/components/lead-status/AutomationDialogChrome'

const CUSTOMER_CONDITION_TYPES = {
  CURRENT_LIFECYCLE_IS: 'current_lifecycle_is',
  CURRENT_LIFECYCLE_IS_NOT: 'current_lifecycle_is_not',
  DAYS_SINCE_CREATED: 'days_since_created',
  DAYS_SINCE_LAST_SESSION: 'days_since_last_session',
  DAYS_SINCE_LAST_PAYMENT: 'days_since_last_payment',
  HAS_ACTIVE_MEMBERSHIP: 'has_active_membership',
  HAS_ACTIVE_PACKAGE: 'has_active_package',
  HAS_ACTIVE_ENROLLMENT: 'has_active_enrollment',
  PACKAGE_EXHAUSTED: 'package_exhausted',
  PACKAGE_COUNT_GTE: 'package_count_gte',
  TOTAL_SPEND_GTE: 'total_spend_gte',
  SESSION_COMPLETED_COUNT_GTE: 'session_completed_count_gte',
  NO_SHOW_COUNT_GTE: 'no_show_count_gte',
  EVENT_OCCURRED: 'event_occurred',
}

const BOOLEAN_TYPES = new Set([
  CUSTOMER_CONDITION_TYPES.HAS_ACTIVE_MEMBERSHIP,
  CUSTOMER_CONDITION_TYPES.HAS_ACTIVE_PACKAGE,
  CUSTOMER_CONDITION_TYPES.HAS_ACTIVE_ENROLLMENT,
  CUSTOMER_CONDITION_TYPES.PACKAGE_EXHAUSTED,
])

const DAY_TYPES = new Set([
  CUSTOMER_CONDITION_TYPES.DAYS_SINCE_CREATED,
  CUSTOMER_CONDITION_TYPES.DAYS_SINCE_LAST_SESSION,
  CUSTOMER_CONDITION_TYPES.DAYS_SINCE_LAST_PAYMENT,
])

const LIFECYCLE_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
]

function blankCondition(type) {
  if (type === CUSTOMER_CONDITION_TYPES.CURRENT_LIFECYCLE_IS)
    return { type, lifecycleStatus: 'active' }
  if (type === CUSTOMER_CONDITION_TYPES.CURRENT_LIFECYCLE_IS_NOT)
    return { type, lifecycleStatus: 'active' }
  if (DAY_TYPES.has(type)) return { type, days: 30 }
  if (BOOLEAN_TYPES.has(type)) return { type, value: true }
  if (type === CUSTOMER_CONDITION_TYPES.PACKAGE_COUNT_GTE) return { type, count: 1 }
  if (type === CUSTOMER_CONDITION_TYPES.TOTAL_SPEND_GTE) return { type, amount: 100 }
  if (type === CUSTOMER_CONDITION_TYPES.SESSION_COMPLETED_COUNT_GTE) return { type, count: 1 }
  if (type === CUSTOMER_CONDITION_TYPES.NO_SHOW_COUNT_GTE) return { type, count: 1 }
  if (type === CUSTOMER_CONDITION_TYPES.EVENT_OCCURRED)
    return { type, event: 'payment_received' }
  return { type }
}

function emptyCondition(catalog) {
  const types = (catalog?.conditions || []).map((c) => c.type)
  const preferred = CUSTOMER_CONDITION_TYPES.EVENT_OCCURRED
  const first = types.includes(preferred) ? preferred : types[0] || preferred
  return blankCondition(first)
}

function createEmptyForm() {
  return {
    name: '',
    description: '',
    isActive: true,
    conditions: [],
    actionStatus: 'active',
  }
}

function formFromRule(rule) {
  if (!rule) return createEmptyForm()
  return {
    name: rule.name || '',
    description: rule.description || '',
    isActive: rule.isActive !== false,
    conditions: hydrateConditionJoins(
      Array.isArray(rule.conditions) ? rule.conditions.map((c) => ({ ...c })) : [],
      rule.logic === 'OR' ? 'OR' : 'AND'
    ),
    actionStatus: rule.action?.status || 'active',
  }
}

function describeCondition(c, events) {
  const eventLabel = (key) =>
    (events || []).find((e) => e.key === key)?.label || String(key || '').replace(/_/g, ' ')
  const statusLabel = (key) =>
    LIFECYCLE_STATUS_OPTIONS.find((s) => s.value === key)?.label || key

  switch (c.type) {
    case CUSTOMER_CONDITION_TYPES.CURRENT_LIFECYCLE_IS:
      return `status is ${statusLabel(c.lifecycleStatus)}`
    case CUSTOMER_CONDITION_TYPES.CURRENT_LIFECYCLE_IS_NOT:
      return `status is not ${statusLabel(c.lifecycleStatus)}`
    case CUSTOMER_CONDITION_TYPES.DAYS_SINCE_CREATED:
      return `created ≥ ${c.days ?? '?'} days ago`
    case CUSTOMER_CONDITION_TYPES.DAYS_SINCE_LAST_SESSION:
      return `no session for ≥ ${c.days ?? '?'} days`
    case CUSTOMER_CONDITION_TYPES.DAYS_SINCE_LAST_PAYMENT:
      return `no payment for ≥ ${c.days ?? '?'} days`
    case CUSTOMER_CONDITION_TYPES.HAS_ACTIVE_MEMBERSHIP:
      return c.value ? 'has active membership' : 'no active membership'
    case CUSTOMER_CONDITION_TYPES.HAS_ACTIVE_PACKAGE:
      return c.value ? 'has active package' : 'no active package'
    case CUSTOMER_CONDITION_TYPES.HAS_ACTIVE_ENROLLMENT:
      return c.value ? 'has active enrollment' : 'no active enrollment'
    case CUSTOMER_CONDITION_TYPES.PACKAGE_EXHAUSTED:
      return c.value ? 'has exhausted package' : 'no exhausted package'
    case CUSTOMER_CONDITION_TYPES.PACKAGE_COUNT_GTE:
      return `packages purchased ≥ ${c.count ?? '?'}`
    case CUSTOMER_CONDITION_TYPES.TOTAL_SPEND_GTE:
      return `total spend ≥ $${c.amount ?? '?'}`
    case CUSTOMER_CONDITION_TYPES.SESSION_COMPLETED_COUNT_GTE:
      return `completed sessions ≥ ${c.count ?? '?'}`
    case CUSTOMER_CONDITION_TYPES.NO_SHOW_COUNT_GTE:
      return `no-shows ≥ ${c.count ?? '?'}`
    case CUSTOMER_CONDITION_TYPES.EVENT_OCCURRED:
      return eventLabel(c.event)
    default:
      return c.type
  }
}

export default function CustomerAutomationFormDialog({ open, onClose, rule, onSaved }) {
  const isEdit = Boolean(rule?._id || rule?.id)
  const [form, setForm] = useState(() => createEmptyForm())
  const [catalog, setCatalog] = useState({
    conditions: [],
    events: [],
    lifecycleStatuses: LIFECYCLE_STATUS_OPTIONS.map((s) => s.value),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError('')

    ;(async () => {
      const res = await api.get('/api/customer-lifecycle-automation/catalog')
      if (cancelled) return

      if (!res?.success) {
        setCatalog({
          conditions: [],
          events: [],
          lifecycleStatuses: LIFECYCLE_STATUS_OPTIONS.map((s) => s.value),
        })
        setError(res?.error || 'Failed to load condition catalog')
        setForm(formFromRule(rule))
        return
      }

      const apiStatuses = Array.isArray(res?.data?.lifecycleStatuses)
        ? res.data.lifecycleStatuses
        : []
      const nextCatalog = {
        conditions: Array.isArray(res?.data?.conditions) ? res.data.conditions : [],
        events: Array.isArray(res?.data?.events) ? res.data.events : [],
        lifecycleStatuses: apiStatuses.length
          ? apiStatuses
          : LIFECYCLE_STATUS_OPTIONS.map((s) => s.value),
      }
      setCatalog(nextCatalog)

      const base = formFromRule(rule)
      if (!base.conditions.length) {
        base.conditions = [emptyCondition(nextCatalog)]
      }
      const wiredKeys = new Set(nextCatalog.events.map((e) => e.key))
      base.conditions = base.conditions.map((c) => {
        if (
          c.type === CUSTOMER_CONDITION_TYPES.EVENT_OCCURRED &&
          c.event &&
          !wiredKeys.has(c.event)
        ) {
          return { ...c, event: nextCatalog.events[0]?.key || 'payment_received' }
        }
        return c
      })
      setForm(base)
    })()

    return () => {
      cancelled = true
    }
  }, [open, rule])

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const conditions = form.conditions || []

  const addCondition = () => {
    setForm((prev) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { ...emptyCondition(catalog), ...(prev.conditions.length ? { join: 'AND' } : {}) },
      ],
    }))
  }

  const updateCondition = (index, patch) => {
    setForm((prev) => {
      const next = prev.conditions.map((c, i) => {
        if (i !== index) return c
        if (patch.type && patch.type !== c.type) {
          const blank = blankCondition(patch.type)
          if (index > 0) blank.join = c.join === 'OR' ? 'OR' : 'AND'
          return blank
        }
        return { ...c, ...patch }
      })
      return { ...prev, conditions: next }
    })
  }

  const removeCondition = (index) => {
    setForm((prev) => {
      const filtered = prev.conditions.filter((_, i) => i !== index)
      return {
        ...prev,
        conditions: filtered.map((c, i) => {
          if (i === 0) {
            const { join: _drop, ...rest } = c
            return rest
          }
          return { ...c, join: c.join === 'OR' ? 'OR' : 'AND' }
        }),
      }
    })
  }

  const plainEnglish = useMemo(() => {
    if (!conditions.length || !form.actionStatus) return null
    const parts = conditions.map((c) => describeCondition(c, catalog.events))
    return `If ${formatJoinedConditionEnglish(parts, conditions)} → mark customer ${form.actionStatus}.`
  }, [conditions, form.actionStatus, catalog.events])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Rule name is required')
      return
    }
    if (!conditions.length) {
      setError('Add at least one condition')
      return
    }

    for (const c of conditions) {
      if (
        (c.type === CUSTOMER_CONDITION_TYPES.CURRENT_LIFECYCLE_IS ||
          c.type === CUSTOMER_CONDITION_TYPES.CURRENT_LIFECYCLE_IS_NOT) &&
        !c.lifecycleStatus
      ) {
        setError('Select a lifecycle status for each status condition')
        return
      }
      if (c.type === CUSTOMER_CONDITION_TYPES.EVENT_OCCURRED && !c.event) {
        setError('Select an event for each event condition')
        return
      }
      if (DAY_TYPES.has(c.type) && (c.days === '' || c.days == null || Number(c.days) < 0)) {
        setError('Enter a valid number of days')
        return
      }
      if (
        (c.type === CUSTOMER_CONDITION_TYPES.PACKAGE_COUNT_GTE ||
          c.type === CUSTOMER_CONDITION_TYPES.SESSION_COMPLETED_COUNT_GTE ||
          c.type === CUSTOMER_CONDITION_TYPES.NO_SHOW_COUNT_GTE) &&
        (c.count === '' || c.count == null || Number(c.count) < 0)
      ) {
        setError('Count must be at least 0')
        return
      }
      if (
        c.type === CUSTOMER_CONDITION_TYPES.TOTAL_SPEND_GTE &&
        (c.amount === '' || c.amount == null || Number(c.amount) < 0)
      ) {
        setError('Amount must be at least 0')
        return
      }
    }

    if (!form.actionStatus || !LIFECYCLE_STATUS_OPTIONS.some((s) => s.value === form.actionStatus)) {
      setError('Select Active, Inactive, or Archived as the action')
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      isActive: form.isActive,
      logic: 'AND',
      conditions: normalizeConditionsForSave(conditions),
      action: { status: form.actionStatus },
    }

    const id = rule?._id || rule?.id
    const res = isEdit
      ? await api.patch(`/api/customer-lifecycle-automation/${id}`, payload)
      : await api.post('/api/customer-lifecycle-automation', payload)

    if (res?.success) {
      onSaved?.({ isEdit })
      onClose()
    } else {
      setError(res?.error || 'Failed to save automation')
    }
    setSaving(false)
  }

  const handleClose = saving ? undefined : onClose

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="2xl">
      <form onSubmit={handleSubmit}>
        <DialogShell
          icon={Users}
          title={isEdit ? 'Edit customer rule' : 'New customer rule'}
          description="When conditions match, mark the customer Active, Inactive, or Archived."
          onClose={handleClose}
          saving={saving}
          footer={<FormActions onCancel={onClose} saving={saving} isEdit={isEdit} />}
        >
          <div className="space-y-7">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-[13px] text-destructive">
                {error}
              </div>
            )}

            <section className="space-y-4">
              <StepHeader step={1} title="Basics" description="Name the rule and decide if it should run." />
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <FieldLabel required>Rule name</FieldLabel>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="e.g. Mark inactive after 90 days no session"
                    disabled={saving}
                    autoFocus={!isEdit}
                    className={fieldClass}
                  />
                </div>
                <ActiveToggle
                  checked={form.isActive}
                  disabled={saving}
                  onChange={(v) => set('isActive', v)}
                />
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Optional note for your team"
                  disabled={saving}
                  className={fieldClass}
                />
              </div>
            </section>

            <section className="space-y-4">
              <StepHeader
                step={2}
                title="When"
                description="Add conditions and choose AND / OR between them. AND groups bind tighter than OR."
              />

              <div className="space-y-0">
                {conditions.map((cond, index) => (
                  <div key={`cond-${index}`} className="space-y-0">
                    {index > 0 && (
                      <div className="py-2">
                        <JoinToggle
                          value={cond.join || 'AND'}
                          disabled={saving}
                          onChange={(join) => updateCondition(index, { join })}
                        />
                      </div>
                    )}
                    <ConditionCard
                      index={index}
                      disabled={saving}
                      canRemove={conditions.length > 1}
                      onRemove={() => removeCondition(index)}
                    >
                      <div>
                        <FieldLabel>Condition type</FieldLabel>
                        <select
                          value={cond.type}
                          onChange={(e) => updateCondition(index, { type: e.target.value })}
                          disabled={saving}
                          className={selectClass}
                        >
                          {(catalog.conditions.length
                            ? catalog.conditions
                            : [
                                {
                                  type: CUSTOMER_CONDITION_TYPES.EVENT_OCCURRED,
                                  label: 'Event has happened',
                                },
                              ]
                          ).map((c) => (
                            <option key={c.type} value={c.type}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {(cond.type === CUSTOMER_CONDITION_TYPES.CURRENT_LIFECYCLE_IS ||
                        cond.type === CUSTOMER_CONDITION_TYPES.CURRENT_LIFECYCLE_IS_NOT) && (
                        <div>
                          <FieldLabel required>Status</FieldLabel>
                          <select
                            value={cond.lifecycleStatus || 'active'}
                            onChange={(e) =>
                              updateCondition(index, { lifecycleStatus: e.target.value })
                            }
                            disabled={saving}
                            className={selectClass}
                          >
                            {(catalog.lifecycleStatuses?.length
                              ? catalog.lifecycleStatuses.map(
                                  (value) =>
                                    LIFECYCLE_STATUS_OPTIONS.find((s) => s.value === value) || {
                                      value,
                                      label: value,
                                    }
                                )
                              : LIFECYCLE_STATUS_OPTIONS
                            ).map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {DAY_TYPES.has(cond.type) && (
                        <div>
                          <FieldLabel required>Days</FieldLabel>
                          <input
                            type="number"
                            min={0}
                            value={cond.days ?? ''}
                            onChange={(e) => updateCondition(index, { days: Number(e.target.value) })}
                            disabled={saving}
                            className={cn(fieldClass, 'max-w-[140px]')}
                          />
                        </div>
                      )}

                      {BOOLEAN_TYPES.has(cond.type) && (
                        <div>
                          <FieldLabel required>Value</FieldLabel>
                          <select
                            value={String(cond.value !== false)}
                            onChange={(e) =>
                              updateCondition(index, { value: e.target.value === 'true' })
                            }
                            disabled={saving}
                            className={cn(selectClass, 'max-w-[160px]')}
                          >
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        </div>
                      )}

                      {(cond.type === CUSTOMER_CONDITION_TYPES.PACKAGE_COUNT_GTE ||
                        cond.type === CUSTOMER_CONDITION_TYPES.SESSION_COMPLETED_COUNT_GTE ||
                        cond.type === CUSTOMER_CONDITION_TYPES.NO_SHOW_COUNT_GTE) && (
                        <div>
                          <FieldLabel required>Minimum count</FieldLabel>
                          <input
                            type="number"
                            min={0}
                            value={cond.count ?? ''}
                            onChange={(e) => updateCondition(index, { count: Number(e.target.value) })}
                            disabled={saving}
                            className={cn(fieldClass, 'max-w-[140px]')}
                          />
                        </div>
                      )}

                      {cond.type === CUSTOMER_CONDITION_TYPES.TOTAL_SPEND_GTE && (
                        <div>
                          <FieldLabel required>Minimum spend</FieldLabel>
                          <div className="relative max-w-[160px]">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">
                              $
                            </span>
                            <input
                              type="number"
                              min={0}
                              value={cond.amount ?? ''}
                              onChange={(e) =>
                                updateCondition(index, { amount: Number(e.target.value) })
                              }
                              disabled={saving}
                              className={cn(fieldClass, 'pl-7')}
                            />
                          </div>
                        </div>
                      )}

                      {cond.type === CUSTOMER_CONDITION_TYPES.EVENT_OCCURRED && (
                        <div>
                          <FieldLabel required>Event</FieldLabel>
                          <select
                            value={cond.event || ''}
                            onChange={(e) => updateCondition(index, { event: e.target.value })}
                            disabled={saving}
                            className={selectClass}
                          >
                            {(catalog.events || []).map((ev) => (
                              <option key={ev.key} value={ev.key}>
                                {ev.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </ConditionCard>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addCondition}
                disabled={saving}
                className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-background text-[12px] font-semibold text-foreground transition hover:border-[var(--studio-primary)]/40 hover:bg-[var(--studio-primary)]/5 disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add condition
              </button>
            </section>

            <section className="space-y-4">
              <StepHeader
                step={3}
                title="Then"
                description="Choose whether to mark the customer Active, Inactive, or Archived."
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    value: 'active',
                    label: 'Active',
                    hint: 'Engaged customer',
                    selectedClass:
                      'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/30',
                    badgeClass: 'bg-emerald-500',
                  },
                  {
                    value: 'inactive',
                    label: 'Inactive',
                    hint: 'Lapsed or idle',
                    selectedClass: 'border-rose-500 bg-rose-500/5 ring-1 ring-rose-500/30',
                    badgeClass: 'bg-rose-500',
                  },
                  {
                    value: 'archived',
                    label: 'Archived',
                    hint: 'Closed / no longer managed',
                    selectedClass: 'border-slate-500 bg-slate-500/5 ring-1 ring-slate-500/30',
                    badgeClass: 'bg-slate-500',
                  },
                ].map((opt) => {
                  const selected = form.actionStatus === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={saving}
                      onClick={() => set('actionStatus', opt.value)}
                      className={cn(
                        'rounded-xl border px-4 py-3.5 text-left transition',
                        selected ? opt.selectedClass : 'border-border bg-background hover:bg-muted/40'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', opt.badgeClass)} />
                        <span className="text-[14px] font-semibold text-foreground">{opt.label}</span>
                      </div>
                      <p className="mt-1 text-[12px] text-muted-foreground">{opt.hint}</p>
                    </button>
                  )
                })}
              </div>
            </section>

            <RulePreview>{plainEnglish}</RulePreview>
          </div>
        </DialogShell>
      </form>
    </Dialog>
  )
}
