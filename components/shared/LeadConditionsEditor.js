'use client'

import { useMemo, useState } from 'react'
import { Copy, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONDITION_LOGIC_OPTIONS } from '@/lib/dynamic-list-constants'
import {
  FILTER_GROUPS as LEAD_FILTER_GROUPS,
  emptyValueForOperator as leadEmptyValueForOperator,
  getDefaultOperatorForField as getLeadDefaultOperator,
  getOperatorsForFilterField as getLeadOperators,
  isValuelessOperator,
  usesMultiValueOperator,
} from '@/lib/dynamic-list-filter-catalog'
import {
  CUSTOMER_FILTER_GROUPS,
  emptyValueForOperator as customerEmptyValueForOperator,
  getDefaultOperatorForCustomerField,
  getOperatorsForCustomerFilterField,
} from '@/lib/customer-list-filter-catalog'
import {
  createEmptyCondition,
  createEmptyConditionGroup,
  findCatalogGroupIdForField,
  summarizeCondition,
} from '@/lib/dynamic-list-normalize'
import CatalogConditionValueInput from '@/components/shared/CatalogConditionValueInput'

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

function getCatalog(entityType) {
  if (entityType === 'customer') {
    return {
      FILTER_GROUPS: CUSTOMER_FILTER_GROUPS,
      emptyValueForOperator: customerEmptyValueForOperator,
      getDefaultOperatorForField: getDefaultOperatorForCustomerField,
      getOperatorsForFilterField: getOperatorsForCustomerFilterField,
    }
  }
  return {
    FILTER_GROUPS: LEAD_FILTER_GROUPS,
    emptyValueForOperator: leadEmptyValueForOperator,
    getDefaultOperatorForField: getLeadDefaultOperator,
    getOperatorsForFilterField: getLeadOperators,
  }
}

function FieldPicker({
  open,
  onClose,
  onPickGroup,
  onPickField,
  step,
  selectedGroupId,
  hiddenFields,
  catalog,
  entityType = 'lead',
}) {
  if (!open) return null

  const group = catalog.FILTER_GROUPS.find((g) => g.id === selectedGroupId)
  const fields = (group?.fields || []).filter((f) => !hiddenFields.has(f.value))

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-[14px] font-semibold text-foreground">
              {step === 'field' ? 'Choose a filter' : 'Choose a filter group'}
            </div>
            <div className="text-[12px] text-muted-foreground">
              {step === 'field'
                ? group?.label || 'Select a field from this group'
                : `Groups organize related ${entityType === 'customer' ? 'customer' : 'lead'} attributes`}
            </div>
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
          {step === 'group'
            ? catalog.FILTER_GROUPS.map((g) => {
                const available = g.fields.filter((f) => !hiddenFields.has(f.value))
                if (available.length === 0) return null
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => onPickGroup(g.id)}
                    className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left hover:bg-muted/40"
                  >
                    <span className="text-[13px] font-semibold text-foreground">{g.label}</span>
                    <span className="text-[11px] text-muted-foreground">{g.description}</span>
                  </button>
                )
              })
            : fields.map((field) => (
                <button
                  key={field.value}
                  type="button"
                  onClick={() => onPickField(field.value)}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-muted/40"
                >
                  <span className="text-[13px] font-medium text-foreground">{field.label}</span>
                  <span className="text-[11px] text-muted-foreground">{field.value}</span>
                </button>
              ))}
        </div>

        {step === 'field' ? (
          <div className="border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={() => onPickGroup(null)}
              className="text-[12px] font-medium text-[var(--studio-primary)] hover:underline"
            >
              ← Back to groups
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function getFieldsForCondition(catalog, catalogGroupId, conditionField) {
  const primary = catalog.FILTER_GROUPS.find((g) => g.id === catalogGroupId)
  const fieldHome = catalog.FILTER_GROUPS.find((g) => g.fields.some((f) => f.value === conditionField))
  const byValue = new Map()
  for (const field of [...(primary?.fields || []), ...(fieldHome?.fields || [])]) {
    byValue.set(field.value, field)
  }
  return Array.from(byValue.values())
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
  readOnly = false,
}) {
  const operators = catalog.getOperatorsForFilterField(condition.field)
  const fields = getFieldsForCondition(catalog, catalogGroupId, condition.field)

  if (!condition.field) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-3 py-3 text-[12px] text-muted-foreground">
        Select a filter field to continue.
      </div>
    )
  }

  if (readOnly) {
    return (
      <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5">
        <div className="text-[12px] font-medium leading-snug text-foreground">
          {summarizeCondition(condition, context, entityType)}
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          From list · read-only
        </div>
      </div>
    )
  }

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

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
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

export default function LeadConditionsEditor({
  groups = [],
  conditionLogic = 'AND',
  onChangeGroups,
  onChangeLogic,
  entityType = 'lead',
  leadReasons = [],
  locations = [],
  forms = [],
  teachers = [],
  tags = [],
  memberships = [],
  loadingOptions = false,
  hiddenFields = new Set(),
}) {
  const catalog = useMemo(() => getCatalog(entityType), [entityType])
  const context = useMemo(
    () => ({ leadReasons, locations, forms, teachers, tags, memberships }),
    [leadReasons, locations, forms, teachers, tags, memberships]
  )
  const entityLabel = entityType === 'customer' ? 'customer' : 'lead'
  const [picker, setPicker] = useState(null)
  // picker: { mode: 'new-group' | 'add-filter', groupIndex?: number, step: 'group' | 'field', selectedGroupId?: string }

  const rows = useMemo(() => (Array.isArray(groups) ? groups : []), [groups])

  const patchGroups = (next) => onChangeGroups?.(next)

  const openNewGroupPicker = () => {
    setPicker({ mode: 'new-group', step: 'group', selectedGroupId: '' })
  }

  const openAddFilterPicker = (groupIndex) => {
    const group = rows[groupIndex]
    if (group?.locked) return
    const catalogGroupId =
      group?.catalogGroupId || findCatalogGroupIdForField(group?.conditions?.[0]?.field, entityType)
    setPicker({
      mode: 'add-filter',
      groupIndex,
      step: catalogGroupId ? 'field' : 'group',
      selectedGroupId: catalogGroupId || '',
    })
  }

  const closePicker = () => setPicker(null)

  const handlePickGroup = (catalogGroupId) => {
    if (!picker) return
    if (catalogGroupId == null) {
      setPicker({ ...picker, step: 'group', selectedGroupId: '' })
      return
    }
    setPicker({ ...picker, step: 'field', selectedGroupId: catalogGroupId })
  }

  const handlePickField = (fieldValue) => {
    if (!picker) return
    const operator = catalog.getDefaultOperatorForField(fieldValue)
    const condition = createEmptyCondition({
      field: fieldValue,
      operator,
      value: catalog.emptyValueForOperator(operator),
      groupId: picker.selectedGroupId,
    })

    if (picker.mode === 'new-group') {
      patchGroups([
        ...rows,
        createEmptyConditionGroup({
          catalogGroupId: picker.selectedGroupId,
          logic: 'AND',
          conditions: [condition],
        }),
      ])
    } else if (typeof picker.groupIndex === 'number') {
      patchGroups(
        rows.map((g, i) =>
          i === picker.groupIndex
            ? {
                ...g,
                catalogGroupId: g.catalogGroupId || picker.selectedGroupId,
                conditions: [
                  ...(g.conditions || []),
                  { ...condition, groupId: g.id || condition.groupId },
                ],
              }
            : g
        )
      )
    }
    closePicker()
  }

  const updateGroup = (index, patch) => {
    if (rows[index]?.locked) return
    patchGroups(rows.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  }

  const updateCondition = (groupIndex, conditionIndex, patch) => {
    if (rows[groupIndex]?.locked) return
    patchGroups(
      rows.map((g, i) => {
        if (i !== groupIndex) return g
        return {
          ...g,
          conditions: (g.conditions || []).map((c, ci) => (ci === conditionIndex ? { ...c, ...patch } : c)),
        }
      })
    )
  }

  const removeCondition = (groupIndex, conditionIndex) => {
    if (rows[groupIndex]?.locked) return
    const group = rows[groupIndex]
    const nextConditions = (group.conditions || []).filter((_, i) => i !== conditionIndex)
    if (nextConditions.length === 0) {
      patchGroups(rows.filter((_, i) => i !== groupIndex))
      return
    }
    updateGroup(groupIndex, { conditions: nextConditions })
  }

  const removeGroup = (groupIndex) => {
    if (rows[groupIndex]?.locked) return
    patchGroups(rows.filter((_, i) => i !== groupIndex))
  }

  const duplicateGroup = (groupIndex) => {
    const source = rows[groupIndex]
    // Duplicates of locked list groups become editable extras.
    const copy = createEmptyConditionGroup({
      catalogGroupId: source.catalogGroupId,
      logic: source.logic,
      locked: false,
      conditions: (source.conditions || []).map((c) =>
        createEmptyCondition({
          field: c.field,
          operator: c.operator,
          value: c.value,
          groupId: source.catalogGroupId,
        })
      ),
    })
    const next = [...rows]
    next.splice(groupIndex + 1, 0, copy)
    patchGroups(next)
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
          <div className="text-[13px] font-medium text-foreground">No filters yet</div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            Choose a filter group, then pick a filter to start building this {entityLabel} list.
          </div>
          <button
            type="button"
            onClick={openNewGroupPicker}
            className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--studio-primary)] px-3 text-[12px] font-semibold text-white hover:brightness-95"
          >
            <Plus className="h-4 w-4" />
            Add filter group
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((group, groupIndex) => {
            const locked = Boolean(group.locked)
            const catalogLabel =
              catalog.FILTER_GROUPS.find((g) => g.id === group.catalogGroupId)?.label ||
              group.catalogGroupId ||
              'Group'
            const conditions = group.conditions || []

            return (
              <div key={group.id || groupIndex} className="space-y-3">
                <div
                  className={cn(
                    'rounded-2xl border bg-card',
                    locked ? 'border-border/70 bg-muted/15' : 'border-border'
                  )}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-foreground">
                        Group {groupIndex + 1}
                        {locked ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            From list
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{catalogLabel}</div>
                    </div>
                    {locked ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateGroup(groupIndex)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40"
                          aria-label="Duplicate as editable filter"
                          title="Duplicate as editable filter"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => duplicateGroup(groupIndex)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40"
                          aria-label="Duplicate group"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGroup(groupIndex)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/40"
                          aria-label="Delete group"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 px-4 py-4">
                    {conditions.map((condition, conditionIndex) => (
                      <div key={condition.id || `${group.id}-${conditionIndex}`} className="space-y-3">
                        <ConditionRow
                          condition={condition}
                          catalogGroupId={group.catalogGroupId}
                          onChange={(patch) => updateCondition(groupIndex, conditionIndex, patch)}
                          onRemove={() => removeCondition(groupIndex, conditionIndex)}
                          context={context}
                          loadingOptions={loadingOptions}
                          canRemove={!locked && (conditions.length > 1 || rows.length > 1)}
                          catalog={catalog}
                          entityType={entityType}
                          readOnly={locked}
                        />
                        {conditionIndex === conditions.length - 1 ? (
                          locked ? null : (
                            <div className="flex flex-wrap items-center gap-2 pl-1">
                              <LogicPill
                                value={group.logic || 'AND'}
                                onChange={(logic) => updateGroup(groupIndex, { logic })}
                              />
                              <button
                                type="button"
                                onClick={() => openAddFilterPicker(groupIndex)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[12px] font-medium text-foreground hover:bg-muted/40"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add filter
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="pl-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {(group.logic || 'AND').toLowerCase()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {groupIndex === rows.length - 1 ? (
                  <div className="flex flex-wrap items-center gap-2 pl-1">
                    <LogicPill value={conditionLogic} onChange={onChangeLogic} />
                    <button
                      type="button"
                      onClick={openNewGroupPicker}
                      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[12px] font-medium text-foreground hover:bg-muted/40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add filter group
                    </button>
                  </div>
                ) : (
                  <div className="pl-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {(conditionLogic || 'AND').toLowerCase()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <FieldPicker
        open={Boolean(picker)}
        onClose={closePicker}
        step={picker?.step || 'group'}
        selectedGroupId={picker?.selectedGroupId || ''}
        onPickGroup={handlePickGroup}
        onPickField={handlePickField}
        hiddenFields={hiddenFields}
        catalog={catalog}
        entityType={entityType}
      />
    </div>
  )
}

export function isConditionComplete(condition) {
  const operator = condition?.operator || 'eq'
  const value = condition?.value
  if (!condition?.field) return false
  if (isValuelessOperator(operator)) return true
  if (usesMultiValueOperator(operator)) {
    return Array.isArray(value) && value.length > 0
  }
  if (operator === 'between') {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return String(value.from || '').trim() !== '' && String(value.to || '').trim() !== ''
    }
    return Array.isArray(value) && value.length === 2 && value.every((v) => String(v || '').trim())
  }
  if (value && typeof value === 'object' && 'key' in value) {
    return String(value.key || '').trim() !== ''
  }
  return String(value ?? '').trim() !== ''
}
