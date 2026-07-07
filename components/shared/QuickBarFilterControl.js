'use client'

import { cn } from '@/lib/utils'
import MultiSelectCheckboxDropdown from '@/components/shared/MultiSelectCheckboxDropdown'
import { FILTER_OPERATOR_OPTIONS, usesMultiValueOperator } from '@/lib/lead-flat-filters'
import {
  getFlatFilterOperator,
  getFlatFilterValues,
  updateFlatFilterOperator,
  updateFlatFilterValue,
} from '@/lib/lead-flat-filters'

const operatorClass =
  'h-11 shrink-0 rounded-xl border border-border bg-background px-2 text-[12px] font-medium text-foreground outline-none focus:border-[var(--studio-primary)]'

const valueSelectClass =
  'h-11 min-w-[140px] rounded-xl border border-border bg-background px-3 text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]'

export default function QuickBarFilterControl({
  filters,
  onChange,
  filterKey,
  operatorKey,
  options = [],
  emptyLabel = 'All',
  className,
  onValueChange,
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
    const next = updateFlatFilterValue(filters, filterKey, operatorKey, nextValue)
    onChange(next)
    onValueChange?.(next, filterKey, nextValue)
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <select
        value={operator}
        onChange={(e) => handleOperatorChange(e.target.value)}
        className={cn(operatorClass, 'w-[92px]')}
        aria-label={`${filterKey} operator`}
      >
        {FILTER_OPERATOR_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {usesMultiValueOperator(operator) ? (
        <div className="min-w-[180px]">
          <MultiSelectCheckboxDropdown
            options={options}
            values={arrayValue}
            onChange={handleValueChange}
            placeholder={operator === 'ne' ? 'Exclude values' : emptyLabel}
            emptyMessage="No options available."
          />
        </div>
      ) : (
        <select
          value={Array.isArray(value) ? String(value[0] ?? '') : String(value || '')}
          onChange={(e) => handleValueChange(e.target.value)}
          className={valueSelectClass}
        >
          <option value="">{emptyLabel}</option>
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
