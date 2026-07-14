'use client'

import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SEARCH_FILTER_DEF } from '@/lib/lead-flat-filters'
import {
  getFlatFilterOperator,
  getFlatFilterValues,
  updateFlatFilterOperator,
  updateFlatFilterValue,
} from '@/lib/lead-flat-filters'

const inputClass =
  'h-11 w-full rounded-xl border border-border bg-background text-[13px] text-foreground outline-none focus:border-[var(--studio-primary)]'

const excludeBtnClass =
  'inline-flex h-11 shrink-0 items-center rounded-xl border border-border bg-background px-4 text-[12px] font-semibold text-foreground hover:bg-muted/40'

export default function QuickBarSearchControl({ filters, onChange, className }) {
  const { filterKey, operatorKey } = SEARCH_FILTER_DEF
  const isExclude = getFlatFilterOperator(filters, operatorKey) === 'ne'
  const searchValue = getFlatFilterValues(filters, filterKey, operatorKey)
  const hasSearch = String(Array.isArray(searchValue) ? searchValue.join('') : searchValue).trim() !== ''

  const inputValue = Array.isArray(filters.search)
    ? filters.search.join(', ')
    : String(filters.search || '')

  const toggleExclude = () => {
    const nextOperator = isExclude ? 'eq' : 'ne'
    onChange(updateFlatFilterOperator(filters, filterKey, operatorKey, nextOperator))
  }

  const handleInputChange = (raw) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      onChange({
        ...filters,
        search: '',
        searchOperator: 'eq',
      })
      return
    }

    if (isExclude) {
      const terms = raw
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
      onChange(updateFlatFilterValue(filters, filterKey, operatorKey, terms))
      return
    }

    onChange(updateFlatFilterValue(filters, filterKey, operatorKey, raw))
  }

  return (
    <div className={cn('flex min-w-0 flex-1 items-center gap-2', className)}>
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search by name, email, phone or location..."
          className={cn(inputClass, 'pl-10 pr-3')}
        />
      </div>

      {hasSearch && (
        <button
          type="button"
          onClick={toggleExclude}
          aria-pressed={isExclude}
          className={cn(
            excludeBtnClass,
            isExclude && 'border-[var(--studio-primary)]/40 bg-[var(--studio-primary)]/10 text-[var(--studio-primary)]'
          )}
        >
          Exclude
        </button>
      )}
    </div>
  )
}
