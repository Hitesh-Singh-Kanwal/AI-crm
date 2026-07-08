'use client'

import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONDITION_LOGIC_OPTIONS } from '@/lib/dynamic-list-constants'
import { CONDITION_FIELDS, getOperatorsForField } from '@/lib/lead-filter-fields'
import { createEmptyCondition } from '@/lib/dynamic-list-normalize'
import {
  emptyValueForOperator,
  getDefaultOperatorForField,
  isValuelessOperator,
  usesMultiValueOperator,
} from '@/lib/dynamic-list-filter-catalog'
import CatalogConditionValueInput from '@/components/shared/CatalogConditionValueInput'

export default function LeadConditionsEditor({
  conditions = [],
  conditionLogic = 'AND',
  onChangeConditions,
  onChangeLogic,
  leadReasons = [],
  locations = [],
  forms = [],
  loadingOptions = false,
  hiddenFields = new Set(),
  disabledFields = new Set(),
  compact = false,
  showLogicToggle = true,
  minConditions = 1,
}) {
  const rows = conditions.length > 0 ? conditions : [createEmptyCondition()]

  const availableFields = CONDITION_FIELDS.filter((field) => !hiddenFields.has(field.value))

  const updateCondition = (idx, patch) => {
    const next = rows.map((c, i) => {
      if (i !== idx) return c
      const updated = { ...c, ...patch }
      if (patch.field && patch.field !== c.field) {
        const ops = getOperatorsForField(patch.field)
        updated.operator = ops[0]?.value || getDefaultOperatorForField(patch.field)
        updated.value = emptyValueForOperator(updated.operator)
      }
      if (patch.operator && patch.operator !== c.operator) {
        updated.value = emptyValueForOperator(patch.operator)
      }
      return updated
    })
    onChangeConditions?.(next)
  }

  const removeCondition = (idx) => {
    if (rows.length <= minConditions) return
    onChangeConditions?.(rows.filter((_, i) => i !== idx))
  }

  const addCondition = () => {
    onChangeConditions?.([...rows, createEmptyCondition()])
  }

  const labelClass = compact
    ? 'mb-1 block text-[11px] text-muted-foreground'
    : 'mb-1.5 block text-[12px] font-medium text-muted-foreground'
  const selectClass = compact
    ? 'h-10 w-full rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-[var(--studio-primary)]'
    : 'h-11 w-full rounded-xl border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]'

  return (
    <div className="space-y-4">
      {showLogicToggle && (
        <div className="flex items-center justify-between gap-3">
          <div className="text-[12px] font-medium text-muted-foreground">Match rules using</div>
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {CONDITION_LOGIC_OPTIONS.map((logic) => (
              <button
                key={logic}
                type="button"
                onClick={() => onChangeLogic?.(logic)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[12px] font-semibold',
                  conditionLogic === logic
                    ? 'bg-[var(--studio-primary)] text-white'
                    : 'text-muted-foreground hover:bg-muted/40'
                )}
              >
                {logic}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((condition, idx) => {
          const operators = getOperatorsForField(condition.field)
          const fieldDisabled = disabledFields.has(condition.field)

          return (
            <div
              key={condition.id || idx}
              className={cn('rounded-xl border border-border bg-background', compact ? 'p-3' : 'p-4')}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className={labelClass}>Field</label>
                  <select
                    value={condition.field}
                    onChange={(e) => updateCondition(idx, { field: e.target.value })}
                    disabled={fieldDisabled}
                    className={selectClass}
                  >
                    {availableFields.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Operator</label>
                  <select
                    value={condition.operator || 'eq'}
                    onChange={(e) => updateCondition(idx, { operator: e.target.value })}
                    disabled={fieldDisabled}
                    className={selectClass}
                  >
                    {operators.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className={labelClass}>Value</label>
                  <CatalogConditionValueInput
                    field={condition.field}
                    operator={condition.operator}
                    value={condition.value}
                    onChange={(value) => updateCondition(idx, { value })}
                    leadReasons={leadReasons}
                    locations={locations}
                    forms={forms}
                    loadingOptions={loadingOptions}
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeCondition(idx)}
                  disabled={rows.length <= minConditions}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-[11px] text-muted-foreground hover:bg-muted/40 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={addCondition}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-muted/40"
      >
        <Plus className="h-4 w-4" />
        Add filter rule
      </button>
    </div>
  )
}

export function isConditionComplete(condition) {
  const operator = condition?.operator || 'eq'
  if (isValuelessOperator(operator)) return Boolean(condition?.field)
  if (usesMultiValueOperator(operator)) {
    return Array.isArray(condition?.value) && condition.value.length > 0
  }
  if (operator === 'between') {
    const value = condition?.value
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return String(value.from || '').trim() !== '' && String(value.to || '').trim() !== ''
    }
    return Array.isArray(value) && value.length === 2 && value.every((v) => String(v || '').trim())
  }
  return String(condition?.value ?? '').trim() !== ''
}
