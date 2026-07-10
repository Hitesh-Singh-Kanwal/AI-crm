'use client'

import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { CONDITION_LOGIC_OPTIONS } from '@/lib/dynamic-list-constants'
import {
  FILTER_GROUPS as LEAD_FILTER_GROUPS,
  conditionHasValue as leadConditionHasValue,
  emptyValueForOperator as leadEmptyValueForOperator,
  getDefaultOperatorForField as getLeadDefaultOperator,
  getFilterFieldDef as getLeadFilterFieldDef,
  getOperatorsForFilterField as getLeadOperators,
} from '@/lib/dynamic-list-filter-catalog'
import {
  CUSTOMER_FILTER_GROUPS,
  conditionHasValue as customerConditionHasValue,
  emptyValueForOperator as customerEmptyValueForOperator,
  getCustomerFilterFieldDef,
  getDefaultOperatorForCustomerField,
  getOperatorsForCustomerFilterField,
} from '@/lib/customer-list-filter-catalog'
import { summarizeCondition } from '@/lib/dynamic-list-normalize'
import FilterLogicToggle from '@/components/shared/FilterLogicToggle'
import CatalogConditionValueInput from '@/components/shared/CatalogConditionValueInput'

function getCatalogApi(entityType) {
  if (entityType === 'customer') {
    return {
      FILTER_GROUPS: CUSTOMER_FILTER_GROUPS,
      conditionHasValue: customerConditionHasValue,
      emptyValueForOperator: customerEmptyValueForOperator,
      getDefaultOperatorForField: getDefaultOperatorForCustomerField,
      getFilterFieldDef: getCustomerFilterFieldDef,
      getOperatorsForFilterField: getOperatorsForCustomerFilterField,
    }
  }
  return {
    FILTER_GROUPS: LEAD_FILTER_GROUPS,
    conditionHasValue: leadConditionHasValue,
    emptyValueForOperator: leadEmptyValueForOperator,
    getDefaultOperatorForField: getLeadDefaultOperator,
    getFilterFieldDef: getLeadFilterFieldDef,
    getOperatorsForFilterField: getLeadOperators,
  }
}

function createCondition(fieldValue, groupId, catalog) {
  const operator = catalog.getDefaultOperatorForField(fieldValue)
  return {
    id: `${fieldValue}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    groupId,
    field: fieldValue,
    operator,
    value: catalog.emptyValueForOperator(operator),
  }
}

function LogicPill({ value = 'AND', onChange, className }) {
  return (
    <select
      value={value === 'OR' ? 'OR' : 'AND'}
      onChange={(e) => onChange?.(e.target.value)}
      className={cn(
        'h-8 rounded-md border border-border bg-background px-2 text-[12px] font-semibold lowercase text-foreground outline-none focus:border-[var(--studio-primary)]',
        className
      )}
      aria-label="Logic"
    >
      {CONDITION_LOGIC_OPTIONS.map((logic) => (
        <option key={logic} value={logic}>
          {logic.toLowerCase()}
        </option>
      ))}
    </select>
  )
}

function FieldPicker({ open, group, hiddenFields, onClose, onPick }) {
  if (!open || !group) return null
  const fields = group.fields.filter((f) => !hiddenFields.has(f.value))

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-[14px] font-semibold text-foreground">Choose a filter</div>
            <div className="text-[12px] text-muted-foreground">{group.label}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[360px] overflow-y-auto p-2">
          {fields.map((field) => (
            <button
              key={field.value}
              type="button"
              onClick={() => onPick(field.value)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-muted/40"
            >
              <span className="text-[13px] font-medium text-foreground">{field.label}</span>
              <span className="text-[11px] text-muted-foreground">{field.value}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ConditionRow({
  condition,
  catalogGroupId,
  onChange,
  onRemove,
  context,
  loadingOptions,
  canRemove,
  catalog,
  entityType,
}) {
  const operators = catalog.getOperatorsForFilterField(condition.field)
  const fields = catalog.FILTER_GROUPS.find((g) => g.id === catalogGroupId)?.fields || []

  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 text-[12px] font-medium leading-snug text-foreground">
          {summarizeCondition(condition, context, entityType)}
        </div>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40"
            aria-label="Remove filter"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-2">
        <select
          value={condition.field}
          onChange={(e) => {
            const field = e.target.value
            const operator = catalog.getDefaultOperatorForField(field)
            onChange({ field, operator, value: catalog.emptyValueForOperator(operator) })
          }}
          className="h-9 rounded-lg border border-border bg-background px-2 text-[12px] outline-none focus:border-[var(--studio-primary)]"
        >
          {fields.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={condition.operator || 'eq'}
          onChange={(e) => {
            const operator = e.target.value
            onChange({ operator, value: catalog.emptyValueForOperator(operator) })
          }}
          className="h-9 rounded-lg border border-border bg-background px-2 text-[12px] outline-none focus:border-[var(--studio-primary)]"
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
          onChange={(value) => onChange({ value })}
          entityType={entityType}
          {...context}
          loadingOptions={loadingOptions}
        />
      </div>
    </div>
  )
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
  context,
  loadingOptions,
  hiddenFields,
  catalog,
  entityType,
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const activeCount = conditions.filter(catalog.conditionHasValue).length

  return (
    <div
      className={cn(
        'rounded-xl transition',
        enabled ? 'border border-[var(--studio-primary)]/20 bg-[var(--studio-primary)]/[0.02]' : ''
      )}
    >
      <div
        className={cn(
          'flex w-full items-center gap-3 px-1 py-3 text-left transition hover:bg-muted/30',
          enabled && 'rounded-t-xl px-3 pt-3.5'
        )}
      >
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label={`Toggle ${group.label}`}
        />
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="text-[14px] font-medium text-foreground">Filter by {group.label.toLowerCase()}</div>
        </button>
        {enabled && activeCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--studio-primary)] px-1.5 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </div>

      {enabled && (
        <div className="space-y-3 border-t border-border/60 px-3 pb-3.5 pt-3">
          {conditions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-background/60 px-3 py-4 text-center">
              <div className="text-[12px] text-muted-foreground">
                Choose a filter from {group.label.toLowerCase()}, then use and / or to add another.
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[12px] font-medium text-foreground hover:bg-muted/40"
              >
                <Plus className="h-3.5 w-3.5" />
                Add filter
              </button>
            </div>
          ) : (
            conditions.map((condition, index) => (
              <div key={condition.id || `${condition.field}-${index}`} className="space-y-3">
                <ConditionRow
                  condition={condition}
                  catalogGroupId={group.id}
                  onChange={(patch) => onUpdate(condition.id, patch)}
                  onRemove={() => onRemove(condition.id)}
                  context={context}
                  loadingOptions={loadingOptions}
                  canRemove
                  catalog={catalog}
                  entityType={entityType}
                />
                {index === conditions.length - 1 ? (
                  <div className="flex flex-wrap items-center gap-2 pl-1">
                    <LogicPill value={logic} onChange={onLogicChange} />
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[12px] font-medium text-foreground hover:bg-muted/40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add filter
                    </button>
                  </div>
                ) : (
                  <div className="pl-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {(logic || 'AND').toLowerCase()}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      <FieldPicker
        open={pickerOpen}
        group={group}
        hiddenFields={hiddenFields}
        onClose={() => setPickerOpen(false)}
        onPick={(fieldValue) => {
          onAdd(fieldValue)
          setPickerOpen(false)
        }}
      />
    </div>
  )
}

export default function GroupedLeadFilterFields({
  draft,
  onDraftChange,
  hiddenFields = new Set(),
  entityType = 'lead',
  locations = [],
  forms = [],
  leadReasons = [],
  teachers = [],
  tags = [],
  memberships = [],
  loadingOptions = false,
}) {
  const catalog = useMemo(() => getCatalogApi(entityType), [entityType])
  const context = useMemo(
    () => ({ leadReasons, locations, forms, teachers, tags, memberships }),
    [leadReasons, locations, forms, teachers, tags, memberships]
  )
  const entityLabel = entityType === 'customer' ? 'customer' : 'lead'

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
        (catalog.FILTER_GROUPS.find((g) => g.id === groupId)?.fields || []).map((f) => f.value)
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
    setConditions([...conditions, createCondition(fieldValue, groupId, catalog)])
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
              ? `A ${entityLabel} must be present in at least one filter group to appear in the segment.`
              : `A ${entityLabel} must be present in all filter groups to appear in the segment.`
          }
        />
      </div>

      <div className="space-y-1">
        {catalog.FILTER_GROUPS.map((group) => {
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
              context={context}
              loadingOptions={loadingOptions}
              hiddenFields={hiddenFields}
              catalog={catalog}
              entityType={entityType}
            />
          )
        })}
      </div>
    </div>
  )
}
