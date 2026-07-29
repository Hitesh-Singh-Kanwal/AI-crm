'use client'

import { useEffect, useMemo, useState } from 'react'
import { Layers, Plus } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  formatJoinedConditionEnglish,
  hydrateConditionJoins,
  normalizeConditionsForSave,
} from '@/lib/condition-logic'
import { Dialog } from '@/components/ui/dialog'
import MultiSelectCheckboxDropdown from '@/components/shared/MultiSelectCheckboxDropdown'
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

const CONDITION_TYPES = {
  CURRENT_STAGE_IS: 'current_stage_is',
  CURRENT_STAGE_IS_NOT: 'current_stage_is_not',
  DAYS_SINCE_CREATED: 'days_since_created',
  DAYS_SINCE_LAST_ACTIVITY: 'days_since_last_activity',
  EVENT_OCCURRED: 'event_occurred',
  EVENT_NOT_OCCURRED: 'event_not_occurred',
  CALL_DURATION_GTE: 'call_duration_gte',
  CALL_USER_TURNS_GTE: 'call_user_turns_gte',
  INBOUND_SMS_COUNT_GTE: 'inbound_sms_count_gte',
  INBOUND_EMAIL_COUNT_GTE: 'inbound_email_count_gte',
  OPT_OUT_EVIDENCE_IS: 'opt_out_evidence_is',
  HUMAN_ESCALATION_REASON_IS: 'human_escalation_reason_is',
}

function resolveStageKeys(c = {}) {
  if (Array.isArray(c.stageKeys) && c.stageKeys.length) {
    return c.stageKeys.map(String).filter(Boolean)
  }
  if (c.stageKey) return [String(c.stageKey)]
  return []
}

function resolveEvidenceKeys(c = {}) {
  if (Array.isArray(c.evidenceKeys) && c.evidenceKeys.length) {
    return c.evidenceKeys.map(String).filter(Boolean)
  }
  if (c.evidenceKey) return [String(c.evidenceKey)]
  return []
}

function blankCondition(type) {
  switch (type) {
    case CONDITION_TYPES.CURRENT_STAGE_IS:
    case CONDITION_TYPES.CURRENT_STAGE_IS_NOT:
      return { type, stageKeys: [] }
    case CONDITION_TYPES.DAYS_SINCE_CREATED:
    case CONDITION_TYPES.DAYS_SINCE_LAST_ACTIVITY:
      return { type, days: 30 }
    case CONDITION_TYPES.EVENT_OCCURRED:
    case CONDITION_TYPES.EVENT_NOT_OCCURRED:
      return { type, event: 'inbound_reply' }
    case CONDITION_TYPES.CALL_DURATION_GTE:
      return { type, seconds: 45 }
    case CONDITION_TYPES.CALL_USER_TURNS_GTE:
      return { type, count: 3 }
    case CONDITION_TYPES.INBOUND_SMS_COUNT_GTE:
      return { type, count: 2 }
    case CONDITION_TYPES.INBOUND_EMAIL_COUNT_GTE:
      return { type, count: 1 }
    case CONDITION_TYPES.OPT_OUT_EVIDENCE_IS:
      return { type, evidenceKeys: ['explicit_keyword', 'ai_classified'] }
    case CONDITION_TYPES.HUMAN_ESCALATION_REASON_IS:
      return { type, evidenceKeys: ['requested_human', 'ai_missing_info'] }
    default:
      return { type }
  }
}

function emptyCondition(catalog) {
  const types = (catalog?.conditions || []).map((c) => c.type)
  const preferred = CONDITION_TYPES.EVENT_OCCURRED
  const first = types.includes(preferred) ? preferred : types[0] || preferred
  return blankCondition(first)
}

function createEmptyForm(statuses = []) {
  return {
    name: '',
    description: '',
    isActive: true,
    conditions: [],
    actionStageKey: statuses.find((s) => s.isActive !== false)?.key || '',
  }
}

function formFromRule(rule, statuses) {
  if (!rule) return createEmptyForm(statuses)
  const conditions = hydrateConditionJoins(
    Array.isArray(rule.conditions)
      ? rule.conditions.map((c) => {
          const next = { ...c }
          if (
            next.type === CONDITION_TYPES.CURRENT_STAGE_IS ||
            next.type === CONDITION_TYPES.CURRENT_STAGE_IS_NOT
          ) {
            next.stageKeys = resolveStageKeys(next)
          }
          if (
            next.type === CONDITION_TYPES.OPT_OUT_EVIDENCE_IS ||
            next.type === CONDITION_TYPES.HUMAN_ESCALATION_REASON_IS
          ) {
            next.evidenceKeys = resolveEvidenceKeys(next)
          }
          return next
        })
      : [],
    rule.logic === 'OR' ? 'OR' : 'AND'
  )
  return {
    name: rule.name || '',
    description: rule.description || '',
    isActive: rule.isActive !== false,
    conditions,
    actionStageKey: rule.action?.stageKey || statuses?.[0]?.key || '',
  }
}

function statusName(statuses, key) {
  return statuses.find((s) => s.key === key)?.name || key || '…'
}

function eventLabel(events, key) {
  return events.find((e) => e.key === key)?.label || String(key || '').replace(/_/g, ' ')
}

function evidenceLabel(options, key) {
  return options.find((o) => o.key === key)?.label || String(key || '').replace(/_/g, ' ')
}

function describeCondition(c, statuses, events, catalog) {
  switch (c.type) {
    case CONDITION_TYPES.CURRENT_STAGE_IS: {
      const keys = resolveStageKeys(c)
      if (!keys.length) return 'stage is …'
      const names = keys.map((k) => statusName(statuses, k))
      return keys.length === 1
        ? `stage is ${names[0]}`
        : `stage is one of ${names.join(', ')}`
    }
    case CONDITION_TYPES.CURRENT_STAGE_IS_NOT: {
      const keys = resolveStageKeys(c)
      if (!keys.length) return 'stage is not …'
      const names = keys.map((k) => statusName(statuses, k))
      return keys.length === 1
        ? `stage is not ${names[0]}`
        : `stage is not any of ${names.join(', ')}`
    }
    case CONDITION_TYPES.DAYS_SINCE_CREATED:
      return `created ≥ ${c.days ?? '?'} days ago`
    case CONDITION_TYPES.DAYS_SINCE_LAST_ACTIVITY:
      return `no activity for ≥ ${c.days ?? '?'} days`
    case CONDITION_TYPES.EVENT_OCCURRED:
      return eventLabel(events, c.event)
    case CONDITION_TYPES.EVENT_NOT_OCCURRED:
      return `${eventLabel(events, c.event)} has not happened`
    case 'package_count_gte':
      return `package purchases ≥ ${c.count ?? '?'}`
    case CONDITION_TYPES.CALL_DURATION_GTE:
      return `latest call ≥ ${c.seconds ?? '?'}s`
    case CONDITION_TYPES.CALL_USER_TURNS_GTE:
      return `lead speaking turns ≥ ${c.count ?? '?'}`
    case CONDITION_TYPES.INBOUND_SMS_COUNT_GTE:
      return `inbound SMS ≥ ${c.count ?? '?'}`
    case CONDITION_TYPES.INBOUND_EMAIL_COUNT_GTE:
      return `inbound email ≥ ${c.count ?? '?'}`
    case CONDITION_TYPES.OPT_OUT_EVIDENCE_IS: {
      const keys = resolveEvidenceKeys(c)
      const options =
        catalog?.conditions?.find((x) => x.type === CONDITION_TYPES.OPT_OUT_EVIDENCE_IS)?.options ||
        catalog?.evidenceOptions?.opt_out ||
        []
      if (!keys.length) return 'opt-out evidence is …'
      return `opt-out evidence is ${keys.map((k) => evidenceLabel(options, k)).join(' or ')}`
    }
    case CONDITION_TYPES.HUMAN_ESCALATION_REASON_IS: {
      const keys = resolveEvidenceKeys(c)
      const options =
        catalog?.conditions?.find((x) => x.type === CONDITION_TYPES.HUMAN_ESCALATION_REASON_IS)
          ?.options ||
        catalog?.evidenceOptions?.human_escalation ||
        []
      if (!keys.length) return 'escalation reason is …'
      return `escalation reason is ${keys.map((k) => evidenceLabel(options, k)).join(' or ')}`
    }
    default:
      return c.type
  }
}

function ConditionValue({ cond, index, saving, activeStatuses, catalog, updateCondition }) {
  if (
    cond.type === CONDITION_TYPES.CURRENT_STAGE_IS ||
    cond.type === CONDITION_TYPES.CURRENT_STAGE_IS_NOT
  ) {
    return (
      <div>
        <FieldLabel required>
          {cond.type === CONDITION_TYPES.CURRENT_STAGE_IS ? 'Stages' : 'Exclude stages'}
        </FieldLabel>
        <MultiSelectCheckboxDropdown
          options={activeStatuses.map((s) => ({ value: s.key, label: s.name }))}
          values={resolveStageKeys(cond)}
          onChange={(stageKeys) => updateCondition(index, { stageKeys })}
          placeholder="Select stages…"
          disabled={saving}
          showSelectAll
        />
      </div>
    )
  }

  if (
    cond.type === CONDITION_TYPES.DAYS_SINCE_CREATED ||
    cond.type === CONDITION_TYPES.DAYS_SINCE_LAST_ACTIVITY
  ) {
    return (
      <div>
        <FieldLabel required>Days</FieldLabel>
        <input
          type="number"
          min={0}
          value={cond.days ?? ''}
          onChange={(e) => updateCondition(index, { days: Number(e.target.value) })}
          disabled={saving}
          className={cn(fieldClass, 'max-w-[120px]')}
        />
      </div>
    )
  }

  if (
    cond.type === CONDITION_TYPES.EVENT_OCCURRED ||
    cond.type === CONDITION_TYPES.EVENT_NOT_OCCURRED
  ) {
    const eventOptions = [...(catalog.events || [])]
    if (cond.event && !eventOptions.some((ev) => ev.key === cond.event)) {
      eventOptions.unshift({
        key: cond.event,
        label: String(cond.event).replace(/_/g, ' '),
      })
    }
    const selected = eventOptions.find((ev) => ev.key === cond.event)
    return (
      <div className="space-y-2">
        <div>
          <FieldLabel required>Event</FieldLabel>
          <select
            value={cond.event || ''}
            onChange={(e) => updateCondition(index, { event: e.target.value })}
            disabled={saving}
            className={selectClass}
          >
            {eventOptions.map((ev) => (
              <option key={ev.key} value={ev.key}>
                {ev.label}
              </option>
            ))}
          </select>
        </div>
        {selected?.description ? (
          <p className="text-xs text-muted-foreground leading-relaxed">{selected.description}</p>
        ) : null}
        {selected?.requiresEvidence ||
        cond.event === 'opt_out_requested' ||
        cond.event === 'human_escalation' ? (
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            This event only fires with verified evidence. Also add an evidence/reason condition below
            so the rule cannot match by mistake.
          </p>
        ) : null}
      </div>
    )
  }

  if (
    cond.type === CONDITION_TYPES.OPT_OUT_EVIDENCE_IS ||
    cond.type === CONDITION_TYPES.HUMAN_ESCALATION_REASON_IS
  ) {
    const meta = (catalog.conditions || []).find((c) => c.type === cond.type)
    const options =
      meta?.options ||
      (cond.type === CONDITION_TYPES.OPT_OUT_EVIDENCE_IS
        ? catalog.evidenceOptions?.opt_out
        : catalog.evidenceOptions?.human_escalation) ||
      []
    return (
      <div className="space-y-2">
        <div>
          <FieldLabel required>
            {cond.type === CONDITION_TYPES.OPT_OUT_EVIDENCE_IS
              ? 'Accepted evidence'
              : 'Accepted reasons'}
          </FieldLabel>
          <MultiSelectCheckboxDropdown
            options={options.map((o) => ({ value: o.key, label: o.label }))}
            values={resolveEvidenceKeys(cond)}
            onChange={(evidenceKeys) => updateCondition(index, { evidenceKeys })}
            placeholder="Select evidence…"
            disabled={saving}
            showSelectAll
          />
        </div>
        {meta?.description ? (
          <p className="text-xs text-muted-foreground leading-relaxed">{meta.description}</p>
        ) : null}
        {options.length ? (
          <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
            {options.map((o) => (
              <li key={o.key}>
                <span className="font-medium text-foreground/80">{o.label}:</span> {o.description}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    )
  }

  if (cond.type === CONDITION_TYPES.CALL_DURATION_GTE) {
    return (
      <div>
        <FieldLabel required>Min seconds</FieldLabel>
        <input
          type="number"
          min={0}
          value={cond.seconds ?? ''}
          onChange={(e) => updateCondition(index, { seconds: Number(e.target.value) })}
          disabled={saving}
          className={cn(fieldClass, 'max-w-[120px]')}
        />
      </div>
    )
  }

  if (
    cond.type === CONDITION_TYPES.CALL_USER_TURNS_GTE ||
    cond.type === CONDITION_TYPES.INBOUND_SMS_COUNT_GTE ||
    cond.type === CONDITION_TYPES.INBOUND_EMAIL_COUNT_GTE
  ) {
    return (
      <div>
        <FieldLabel required>
          {cond.type === CONDITION_TYPES.CALL_USER_TURNS_GTE ? 'Min turns' : 'Min count'}
        </FieldLabel>
        <input
          type="number"
          min={0}
          value={cond.count ?? ''}
          onChange={(e) => updateCondition(index, { count: Number(e.target.value) })}
          disabled={saving}
          className={cn(fieldClass, 'max-w-[120px]')}
        />
      </div>
    )
  }

  return null
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
  const [catalog, setCatalog] = useState({ conditions: [], events: [], evidenceOptions: {} })
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
        evidenceOptions: res?.data?.evidenceOptions || {},
      }
      if (cancelled) return
      setCatalog(nextCatalog)

      const base = formFromRule(rule, statuses)
      if (!base.actionStageKey && statuses.length) {
        base.actionStageKey = statuses.find((s) => s.isActive)?.key || statuses[0].key
      }
      if (!base.conditions.length) {
        base.conditions = [emptyCondition(nextCatalog)]
      }
      const allowedTypes = new Set(nextCatalog.conditions.map((c) => c.type))
      base.conditions = base.conditions.map((c) => {
        if (!allowedTypes.has(c.type)) {
          return emptyCondition(nextCatalog)
        }
        // Keep hidden/legacy events (e.g. lead_converted on seeded rules).
        // Only replace when the event is missing entirely.
        if (
          (c.type === CONDITION_TYPES.EVENT_OCCURRED ||
            c.type === CONDITION_TYPES.EVENT_NOT_OCCURRED) &&
          !c.event
        ) {
          return { ...c, event: nextCatalog.events[0]?.key || 'inbound_reply' }
        }
        return c
      })
      setForm(base)
    })()

    return () => {
      cancelled = true
    }
  }, [open, rule, statuses])

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const conditions = form.conditions || []
  const activeStatuses = statuses.filter((s) => s.isActive !== false)
  const conditionTypeOptions = catalog.conditions.length
    ? catalog.conditions
    : [{ type: CONDITION_TYPES.EVENT_OCCURRED, label: 'Event has happened' }]

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
    if (!conditions.length || !form.actionStageKey) return null
    const parts = conditions.map((c) => describeCondition(c, statuses, catalog.events, catalog))
    return `If ${formatJoinedConditionEnglish(parts, conditions)} → set stage to ${statusName(statuses, form.actionStageKey)}.`
  }, [conditions, form.actionStageKey, statuses, catalog])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Rule name is required')
      return
    }
    if (!form.actionStageKey) {
      setError('Pick a target stage')
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
        !resolveStageKeys(c).length
      ) {
        setError('Select at least one stage for each stage condition')
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
      if (
        (c.type === CONDITION_TYPES.DAYS_SINCE_CREATED ||
          c.type === CONDITION_TYPES.DAYS_SINCE_LAST_ACTIVITY) &&
        (c.days === '' || c.days == null || Number(c.days) < 0)
      ) {
        setError('Enter a valid number of days')
        return
      }
      if (
        c.type === CONDITION_TYPES.CALL_DURATION_GTE &&
        (c.seconds === '' || c.seconds == null || Number(c.seconds) < 0)
      ) {
        setError('Enter a valid call duration in seconds')
        return
      }
      if (
        (c.type === CONDITION_TYPES.CALL_USER_TURNS_GTE ||
          c.type === CONDITION_TYPES.INBOUND_SMS_COUNT_GTE ||
          c.type === CONDITION_TYPES.INBOUND_EMAIL_COUNT_GTE) &&
        (c.count === '' || c.count == null || Number(c.count) < 0)
      ) {
        setError('Enter a valid count')
        return
      }
      if (
        (c.type === CONDITION_TYPES.OPT_OUT_EVIDENCE_IS ||
          c.type === CONDITION_TYPES.HUMAN_ESCALATION_REASON_IS) &&
        !resolveEvidenceKeys(c).length
      ) {
        setError('Select at least one evidence / reason option')
        return
      }
    }

    const hasOptOutEvent = conditions.some(
      (c) =>
        (c.type === CONDITION_TYPES.EVENT_OCCURRED || c.type === CONDITION_TYPES.EVENT_NOT_OCCURRED) &&
        c.event === 'opt_out_requested'
    )
    const hasHumanEvent = conditions.some(
      (c) =>
        (c.type === CONDITION_TYPES.EVENT_OCCURRED || c.type === CONDITION_TYPES.EVENT_NOT_OCCURRED) &&
        c.event === 'human_escalation'
    )
    if (
      hasOptOutEvent &&
      !conditions.some((c) => c.type === CONDITION_TYPES.OPT_OUT_EVIDENCE_IS)
    ) {
      setError(
        'Opt-out / DND rules must also include “Opt-out evidence type is” so they only fire with verified evidence.'
      )
      return
    }
    if (
      hasHumanEvent &&
      !conditions.some((c) => c.type === CONDITION_TYPES.HUMAN_ESCALATION_REASON_IS)
    ) {
      setError(
        'Human escalation rules must also include “Human escalation reason is” so they only fire with a verified reason.'
      )
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      isActive: form.isActive,
      logic: 'AND',
      conditions: normalizeConditionsForSave(
        conditions.map((c) => {
          if (
            c.type === CONDITION_TYPES.CURRENT_STAGE_IS ||
            c.type === CONDITION_TYPES.CURRENT_STAGE_IS_NOT
          ) {
            const stageKeys = resolveStageKeys(c)
            return { ...c, stageKeys, stageKey: stageKeys[0] }
          }
          return c
        })
      ),
      action: { type: 'set_stage', stageKey: form.actionStageKey },
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

  const handleClose = saving ? undefined : onClose

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg">
      <form onSubmit={handleSubmit}>
        <DialogShell
          icon={Layers}
          title={isEdit ? 'Edit lead rule' : 'New lead rule'}
          description="If conditions match, move the lead to a stage."
          onClose={handleClose}
          saving={saving}
          footer={<FormActions onCancel={onClose} saving={saving} isEdit={isEdit} />}
        >
          <div className="space-y-5">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
                {error}
              </div>
            )}

            <section className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <FieldLabel required>Rule name</FieldLabel>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="e.g. Engaged on meaningful chat"
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

            <section className="space-y-3">
              <StepHeader step={1} title="When" description="Build the match criteria." />

              <div className="space-y-0">
                {conditions.map((cond, index) => (
                  <div key={`cond-${index}`}>
                    {index > 0 && (
                      <div className="py-1.5">
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
                        <FieldLabel>Type</FieldLabel>
                        <select
                          value={cond.type}
                          onChange={(e) => updateCondition(index, { type: e.target.value })}
                          disabled={saving}
                          className={selectClass}
                        >
                          {conditionTypeOptions.map((c) => (
                            <option key={c.type} value={c.type}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <ConditionValue
                        cond={cond}
                        index={index}
                        saving={saving}
                        activeStatuses={activeStatuses}
                        catalog={catalog}
                        updateCondition={updateCondition}
                      />
                    </ConditionCard>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addCondition}
                disabled={saving}
                className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-[12px] font-semibold text-muted-foreground transition hover:border-[var(--studio-primary)]/40 hover:text-foreground disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add condition
              </button>
            </section>

            <section className="space-y-3">
              <StepHeader step={2} title="Then" description="Move matching leads to this stage." />
              <select
                value={form.actionStageKey}
                onChange={(e) => set('actionStageKey', e.target.value)}
                disabled={saving}
                className={selectClass}
              >
                <option value="">Select stage…</option>
                {activeStatuses.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </section>

            <RulePreview>{plainEnglish}</RulePreview>
          </div>
        </DialogShell>
      </form>
    </Dialog>
  )
}
