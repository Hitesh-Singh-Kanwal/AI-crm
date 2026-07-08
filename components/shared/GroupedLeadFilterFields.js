'use client'

import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
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

function createCondition(fieldValue, groupId) {
  const operator = getDefaultOperatorForField(fieldValue)
  return {
    id: `${fieldValue}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    groupId,
    field: fieldValue,
    operator,
    value: emptyValueForOperator(operator),
  }
}

function GroupToggleRow({
  group,
  enabled,
  onToggle,
  logic,
  onLogicChange,
  conditions,
  onAdd,
  onUpdate,
  onRemove,
  leadReasons,
  locations,
  forms,
  loadingOptions,
  availableFields,
}) {
  const activeCount = conditions.filter(conditionHasValue).length

  return (
    <div
      className={cn(
        'rounded-xl transition',
        enabled ? 'border border-[var(--studio-primary)]/20 bg-[var(--studio-primary)]/[0.02]' : ''
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onToggle(!enabled)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle(!enabled)
          }
        }}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 px-1 py-3 text-left transition hover:bg-muted/30',
          enabled && 'rounded-t-xl px-3 pt-3.5'
        )}
      >
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Toggle ${group.label}`}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium text-foreground">Filter by {group.label.toLowerCase()}</div>
        </div>
        {enabled && activeCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--studio-primary)] px-1.5 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </div>

      {enabled && (
        <div className="space-y-3 border-t border-border/60 px-3 pb-3.5 pt-3">
          <FilterLogicToggle
            size="sm"
            label=""
            value={logic}
            onChange={onLogicChange}
            helpText={
              logic === 'OR'
                ? `Within ${group.label.toLowerCase()}, a lead must match at least one selected rule.`
                : `Within ${group.label.toLowerCase()}, a lead must match all selected rules.`
            }
          />

          {conditions.map((condition) => {
            const def = getFilterFieldDef(condition.field)
            const operators = getOperatorsForFilterField(condition.field)
            return (
              <div
                key={condition.id || `${condition.field}-${condition.operator}`}
                className="rounded-xl border border-border bg-background p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-[12px] font-semibold text-foreground">{def?.label || condition.field}</div>
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
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-[11px] font-medium text-foreground hover:border-[var(--studio-primary)]/30 hover:bg-[var(--studio-primary)]/5"
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

  const groupLogics = draft?.groupLogics || {}
  const enabledGroups = draft?.enabledGroups || {}

  const patchDraft = (patch) => onDraftChange({ ...draft, ...patch })

  const setConditions = (nextConditions) => patchDraft({ conditions: nextConditions })

  const setGroupEnabled = (groupId, enabled) => {
    const nextEnabled = { ...enabledGroups, [groupId]: enabled }
    if (!enabled) {
      const groupFieldValues = new Set(
        (FILTER_GROUPS.find((g) => g.id === groupId)?.fields || []).map((f) => f.value)
      )
      const nextConditions = conditions.filter(
        (c) => !(c.groupId === groupId || groupFieldValues.has(c.field))
      )
      const nextLogics = { ...groupLogics }
      delete nextLogics[groupId]
      patchDraft({
        enabledGroups: nextEnabled,
        groupLogics: nextLogics,
        conditions: nextConditions,
      })
      return
    }
    patchDraft({
      enabledGroups: nextEnabled,
      groupLogics: { ...groupLogics, [groupId]: groupLogics[groupId] || 'AND' },
    })
  }

  const setGroupLogic = (groupId, logic) => {
    patchDraft({ groupLogics: { ...groupLogics, [groupId]: logic } })
  }

  const addCondition = (fieldValue, groupId) => {
    setConditions([...conditions, createCondition(fieldValue, groupId)])
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

  const isGroupEnabled = (group) => {
    if (enabledGroups[group.id] === false) return false
    if (enabledGroups[group.id] === true) return true
    // Auto-enable if it already has conditions (e.g. restored draft)
    return conditions.some((c) => c.groupId === group.id || group.fields.some((f) => f.value === c.field))
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 text-[13px] font-semibold text-foreground">Step 1: Choose a filter type</div>
        <FilterLogicToggle
          value={draft.conditionLogic || 'AND'}
          onChange={(logic) => patchDraft({ conditionLogic: logic })}
          label=""
          helpText={
            (draft.conditionLogic || 'AND') === 'OR'
              ? 'A lead must be present in at least one filter to appear in the segment.'
              : 'A lead must be present in all filters to appear in the segment.'
          }
        />
      </div>

      <div className="space-y-1">
        {FILTER_GROUPS.map((group) => {
          const availableFields = group.fields.filter((f) => !hiddenFields.has(f.value))
          if (availableFields.length === 0) return null
          const enabled = isGroupEnabled(group)
          const groupConditions = conditions.filter(
            (c) => c.groupId === group.id || availableFields.some((f) => f.value === c.field)
          )

          return (
            <GroupToggleRow
              key={group.id}
              group={group}
              enabled={enabled}
              onToggle={(checked) => setGroupEnabled(group.id, checked)}
              logic={groupLogics[group.id] || 'AND'}
              onLogicChange={(logic) => setGroupLogic(group.id, logic)}
              conditions={groupConditions}
              onAdd={(fieldValue) => addCondition(fieldValue, group.id)}
              onUpdate={updateCondition}
              onRemove={removeCondition}
              leadReasons={leadReasons}
              locations={locations}
              forms={forms}
              loadingOptions={loadingOptions}
              availableFields={availableFields}
            />
          )
        })}
      </div>
    </div>
  )
}
