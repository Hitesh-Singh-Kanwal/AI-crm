'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FILTER_GROUPS,
  conditionHasValue,
  emptyValueForOperator,
  getDefaultOperatorForField,
  getFilterFieldDef,
  getOperatorsForFilterField,
} from '@/lib/dynamic-list-filter-catalog'
import FilterLogicToggle from '@/components/shared/FilterLogicToggle'
import CatalogConditionValueInput from '@/components/shared/CatalogConditionValueInput'

function createCondition(fieldValue) {
  const operator = getDefaultOperatorForField(fieldValue)
  return {
    id: `${fieldValue}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    field: fieldValue,
    operator,
    value: emptyValueForOperator(operator),
  }
}

function GroupSection({
  group,
  conditions,
  onAdd,
  onUpdate,
  onRemove,
  leadReasons,
  locations,
  forms,
  loadingOptions,
  hiddenFields,
}) {
  const [open, setOpen] = useState(group.id === 'lead_profile' || group.id === 'utm' || group.id === 'timing')
  const availableFields = group.fields.filter((f) => !hiddenFields.has(f.value))
  const groupConditions = conditions.filter((c) => availableFields.some((f) => f.value === c.field))
  const activeCount = groupConditions.filter(conditionHasValue).length

  if (availableFields.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30"
      >
        <div>
          <div className="text-[13px] font-semibold text-foreground">{group.label}</div>
          <div className="text-[11px] text-muted-foreground">{group.description}</div>
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--studio-primary)] px-1.5 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="space-y-3 border-t border-border px-4 py-4">
          {groupConditions.map((condition) => {
            const def = getFilterFieldDef(condition.field)
            const operators = getOperatorsForFilterField(condition.field)
            return (
              <div key={condition.id || `${condition.field}-${condition.operator}`} className="rounded-lg border border-border/70 bg-card p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[12px] font-medium text-foreground">{def?.label || condition.field}</div>
                  <button
                    type="button"
                    onClick={() => onRemove(condition.id)}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] text-muted-foreground hover:bg-muted/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <select
                    value={condition.operator}
                    onChange={(e) => {
                      const nextOperator = e.target.value
                      onUpdate(condition.id, {
                        operator: nextOperator,
                        value: emptyValueForOperator(nextOperator),
                      })
                    }}
                    className="h-9 w-full rounded-lg border border-border bg-background px-2 text-[12px] outline-none focus:border-[var(--studio-primary)]"
                  >
                    {operators.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  <CatalogConditionValueInput
                    field={condition.field}
                    operator={condition.operator}
                    value={condition.value}
                    onChange={(nextValue) => onUpdate(condition.id, { value: nextValue })}
                    leadReasons={leadReasons}
                    locations={locations}
                    forms={forms}
                    loadingOptions={loadingOptions}
                  />
                </div>
              </div>
            )
          })}

          <div className="flex flex-wrap gap-2">
            {availableFields.map((fieldDef) => (
              <button
                key={fieldDef.value}
                type="button"
                onClick={() => onAdd(fieldDef.value)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[11px] font-medium text-foreground hover:bg-muted/40"
              >
                <Plus className="h-3.5 w-3.5" />
                {fieldDef.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function GroupedLeadFilterFields({
  draft,
  onDraftChange,
  hiddenFields = new Set(),
  locations = [],
  forms = [],
  leadReasons = [],
  loadingOptions = false,
}) {
  const conditions = useMemo(
    () => (Array.isArray(draft?.conditions) ? draft.conditions : []),
    [draft?.conditions]
  )

  const setConditions = (nextConditions) => {
    onDraftChange({ ...draft, conditions: nextConditions })
  }

  const addCondition = (fieldValue) => {
    setConditions([...conditions, createCondition(fieldValue)])
  }

  const updateCondition = (id, patch) => {
    setConditions(
      conditions.map((c) => {
        if (c.id !== id) return c
        return { ...c, ...patch }
      })
    )
  }

  const removeCondition = (id) => {
    setConditions(conditions.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-4">
      <FilterLogicToggle
        value={draft.conditionLogic || 'AND'}
        onChange={(logic) => onDraftChange({ ...draft, conditionLogic: logic })}
      />

      <div className="space-y-3">
        {FILTER_GROUPS.map((group) => (
          <GroupSection
            key={group.id}
            group={group}
            conditions={conditions}
            onAdd={addCondition}
            onUpdate={updateCondition}
            onRemove={removeCondition}
            leadReasons={leadReasons}
            locations={locations}
            forms={forms}
            loadingOptions={loadingOptions}
            hiddenFields={hiddenFields}
          />
        ))}
      </div>
    </div>
  )
}
