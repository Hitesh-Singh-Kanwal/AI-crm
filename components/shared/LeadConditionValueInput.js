'use client'

import MultiSelectCheckboxDropdown from '@/components/shared/MultiSelectCheckboxDropdown'
import {
  getConditionFieldDef,
  getFieldValueOptions,
  normalizeConditionValue,
} from '@/lib/lead-filter-fields'

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]'

export default function LeadConditionValueInput({
  condition,
  onChange,
  leadReasons = [],
  locations = [],
  forms = [],
  loadingOptions = false,
}) {
  const field = condition?.field || 'stage'
  const operator = condition?.operator || 'eq'
  const def = getConditionFieldDef(field)
  const context = { leadReasons, locations, forms }
  const labeledOptions = getFieldValueOptions(field, context)
  const inputType = def?.inputType || 'text'
  const isMulti = operator === 'in' || operator === 'ne'

  if (isMulti) {
    const values = Array.isArray(condition.value)
      ? condition.value
      : normalizeConditionValue(operator, condition.value)

    if (labeledOptions) {
      if (labeledOptions.length === 0) {
        return (
          <div className="rounded-lg border border-dashed border-border px-3 py-2 text-[12px] text-muted-foreground">
            {loadingOptions ? 'Loading options…' : 'No options available.'}
          </div>
        )
      }

      return (
        <MultiSelectCheckboxDropdown
          options={labeledOptions}
          values={values}
          onChange={onChange}
          placeholder={operator === 'ne' ? 'Select values to exclude' : 'Select one or more values'}
          disabled={loadingOptions && (def?.optionsKey === 'locations' || def?.optionsKey === 'forms')}
          emptyMessage={loadingOptions ? 'Loading options…' : 'No options available.'}
        />
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
        className={inputClass}
      />
    )
  }

  if (inputType === 'date') {
    return (
      <input
        type="date"
        value={String(condition.value || '')}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    )
  }

  if (inputType === 'number') {
    return (
      <input
        type="number"
        min={1}
        step={1}
        value={String(condition.value || '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. 90"
        className={inputClass}
      />
    )
  }

  if (labeledOptions) {
    if (labeledOptions.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-[12px] text-muted-foreground">
          {loadingOptions ? 'Loading options…' : 'No options available.'}
        </div>
      )
    }

    return (
      <select
        value={String(condition.value || '')}
        onChange={(e) => onChange(e.target.value)}
        disabled={loadingOptions && (def?.optionsKey === 'locations' || def?.optionsKey === 'forms')}
        className={inputClass}
      >
        <option value="">Select value</option>
        {labeledOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
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
      className={inputClass}
    />
  )
}
