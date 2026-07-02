'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  CONDITION_FIELDS,
  CONDITION_LOGIC_OPTIONS,
  CONDITION_OPERATORS,
  STATUS_OPTIONS,
} from '@/lib/dynamic-list-constants'
import {
  buildDynamicListPayload,
  createEmptyCondition,
  getFieldValueOptions,
  normalizeConditionValue,
  normalizeDynamicListFromApi,
} from '@/lib/dynamic-list-normalize'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function createEmptyForm() {
  return {
    name: '',
    description: '',
    conditionLogic: 'AND',
    conditions: [createEmptyCondition()],
    status: 'active',
  }
}

function ConditionValueInput({ condition, onChange }) {
  const options = getFieldValueOptions(condition.field)
  const operator = condition.operator || 'eq'

  if (operator === 'in') {
    const values = Array.isArray(condition.value)
      ? condition.value
      : normalizeConditionValue('in', condition.value)

    const toggleValue = (val) => {
      const next = values.includes(val) ? values.filter((v) => v !== val) : [...values, val]
      onChange(next)
    }

    if (options) {
      return (
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => {
            const selected = values.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggleValue(opt)}
                className={cn(
                  'rounded-full border px-3 py-1 text-[12px] transition-colors',
                  selected
                    ? 'border-[var(--studio-primary)] bg-[var(--studio-primary)]/10 text-foreground'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                )}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )
    }

    return (
      <input
        value={Array.isArray(condition.value) ? condition.value.join(', ') : String(condition.value || '')}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean)
          )
        }
        placeholder="value1, value2"
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]"
      />
    )
  }

  if (options) {
    return (
      <select
        value={String(condition.value || '')}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]"
      >
        <option value="">Select value</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      value={String(condition.value || '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Enter value"
      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]"
    />
  )
}

export default function DynamicListFormDialog({ open, onClose, list, onSaved }) {
  const isEdit = Boolean(list?._id || list?.id)
  const [form, setForm] = useState(createEmptyForm())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setError('')
    if (list) {
      const normalized = normalizeDynamicListFromApi(list)
      setForm({
        name: normalized?.name || '',
        description: normalized?.description || '',
        conditionLogic: normalized?.conditionLogic || 'AND',
        conditions: normalized?.conditions || [createEmptyCondition()],
        status: normalized?.status || 'active',
      })
    } else {
      setForm(createEmptyForm())
    }
  }, [open, list])

  const canSubmit = useMemo(() => {
    if (!form.name.trim()) return false
    return form.conditions.every((c) => {
      if (c.operator === 'in') {
        const values = normalizeConditionValue('in', c.value)
        return values.length > 0
      }
      return String(c.value || '').trim() !== ''
    })
  }, [form])

  const updateCondition = (idx, patch) => {
    setForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => {
        if (i !== idx) return c
        const next = { ...c, ...patch }
        if (patch.field && patch.field !== c.field) next.value = patch.operator === 'in' ? [] : ''
        if (patch.operator === 'in' && c.operator !== 'in') next.value = []
        if (patch.operator && patch.operator !== 'in' && c.operator === 'in') next.value = ''
        return next
      }),
    }))
  }

  const submit = async () => {
    if (!canSubmit || saving) return
    setSaving(true)
    setError('')
    const payload = buildDynamicListPayload(form)
    const id = list?._id || list?.id
    const res = isEdit
      ? await api.patch(`/api/dynamic-list/${id}`, payload)
      : await api.post('/api/dynamic-list', payload)

    if (res?.success) {
      onSaved?.({
        list: res?.data || { ...payload, _id: id },
        isEdit,
      })
      onClose?.()
    } else {
      setError(res?.error || `Failed to ${isEdit ? 'update' : 'create'} dynamic list.`)
    }
    setSaving(false)
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="4xl">
      <DialogContent className="max-h-[90vh] overflow-y-auto" onClose={saving ? undefined : onClose}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit dynamic list' : 'Create dynamic list'}</DialogTitle>
          <DialogDescription>
            Define conditions that automatically add or remove leads from this segment.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="New form leads"
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-foreground">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[13px] font-medium text-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
                placeholder="Optional description"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[14px] text-foreground outline-none focus:border-[var(--studio-primary)]"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold text-foreground">Conditions</div>
                <div className="text-[12px] text-muted-foreground">
                  Leads must match these rules to enter the list. Link workflows to this list from the workflow builder.
                </div>
              </div>
              <div className="inline-flex rounded-lg border border-border bg-card p-1">
                {CONDITION_LOGIC_OPTIONS.map((logic) => (
                  <button
                    key={logic}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, conditionLogic: logic }))}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-[12px] font-semibold',
                      form.conditionLogic === logic
                        ? 'bg-[var(--studio-primary)] text-white'
                        : 'text-muted-foreground hover:bg-muted/40'
                    )}
                  >
                    {logic}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {form.conditions.map((condition, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-card p-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">Field</label>
                      <select
                        value={condition.field}
                        onChange={(e) => updateCondition(idx, { field: e.target.value })}
                        className="h-10 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                      >
                        {CONDITION_FIELDS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] text-muted-foreground">Operator</label>
                      <select
                        value={condition.operator}
                        onChange={(e) => updateCondition(idx, { operator: e.target.value })}
                        className="h-10 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]"
                      >
                        {CONDITION_OPERATORS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-[11px] text-muted-foreground">Value</label>
                      <ConditionValueInput
                        condition={condition}
                        onChange={(value) => updateCondition(idx, { value })}
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          conditions:
                            p.conditions.length === 1
                              ? p.conditions
                              : p.conditions.filter((_, i) => i !== idx),
                        }))
                      }
                      disabled={form.conditions.length === 1}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:bg-muted/40 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() =>
                setForm((p) => ({ ...p, conditions: [...p.conditions, createEmptyCondition()] }))
              }
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-muted/40"
            >
              <Plus className="h-4 w-4" />
              Add condition
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-[13px] font-medium text-foreground hover:bg-muted/40 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || saving}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--studio-primary)] px-4 text-[13px] font-medium text-white hover:brightness-95 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create list'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
