'use client'

import MultiSelectCheckboxDropdown from '@/components/shared/MultiSelectCheckboxDropdown'
import { FILTER_OPERATOR_OPTIONS, usesMultiValueOperator } from '@/lib/lead-flat-filters'
import {
  getFlatFilterOperator,
  getFlatFilterValues,
  updateFlatFilterOperator,
  updateFlatFilterValue,
} from '@/lib/lead-flat-filters'

const operatorSelectClass =
  'h-8 rounded-lg border border-border bg-background px-2 text-[11px] font-medium text-foreground outline-none focus:border-[var(--studio-primary)]'

const valueSelectClass =
  'h-11 w-full rounded-xl border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]'

export default function FilterFieldWithOperator({
  label,
  filterKey,
  operatorKey,
  filters,
  onChange,
  options = [],
  loadingOptions = false,
  disabled = false,
  emptyOptionLabel = 'All',
}) {
  const operator = getFlatFilterOperator(filters, operatorKey)
  const value = getFlatFilterValues(filters, filterKey, operatorKey)
  const arrayValue = usesMultiValueOperator(operator)
    ? Array.isArray(value)
      ? value
      : value
        ? [value]
        : []
    : []

  const handleOperatorChange = (nextOperator) => {
    onChange(updateFlatFilterOperator(filters, filterKey, operatorKey, nextOperator))
  }

  const handleValueChange = (nextValue) => {
    onChange(updateFlatFilterValue(filters, filterKey, operatorKey, nextValue))
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label className="text-[12px] font-medium text-muted-foreground">{label}</label>
        <select
          value={operator}
          onChange={(e) => handleOperatorChange(e.target.value)}
          disabled={disabled}
          className={operatorSelectClass}
        >
          {FILTER_OPERATOR_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {usesMultiValueOperator(operator) ? (
        <MultiSelectCheckboxDropdown
          options={options}
          values={arrayValue}
          onChange={handleValueChange}
          placeholder={operator === 'ne' ? 'Select values to exclude' : emptyOptionLabel}
          disabled={disabled || loadingOptions}
          emptyMessage={loadingOptions ? 'Loading…' : 'No options available.'}
        />
      ) : (
        <select
          value={Array.isArray(value) ? String(value[0] ?? '') : String(value || '')}
          onChange={(e) => handleValueChange(e.target.value)}
          disabled={disabled || loadingOptions}
          className={valueSelectClass}
        >
          <option value="">{loadingOptions ? 'Loading…' : emptyOptionLabel}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
