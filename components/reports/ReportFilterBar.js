'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import DateRangePresets from '@/components/dashboard-builder/DateRangePresets'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { dateBoundsFromPresetDays } from '@/lib/reports/reportFilters'

const FILTER_CONTROL_CLASS =
  'h-9 w-[11.5rem] rounded-lg border-border bg-background text-[13px] shadow-sm focus:ring-[var(--studio-primary)]/30'

function FilterField({ label, htmlFor, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold uppercase tracking-[0.04em] text-foreground/55"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function FilterSelect({ label, value, onValueChange, options, placeholder }) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, '-')}`
  const hasValue = Boolean(value)

  return (
    <FilterField label={label} htmlFor={id}>
      <Select
        id={id}
        className={[
          FILTER_CONTROL_CLASS,
          hasValue ? 'border-[var(--studio-primary)]/35 text-foreground' : 'text-foreground/80',
        ].join(' ')}
        value={value || ''}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </Select>
    </FilterField>
  )
}

function isDateDirty(filters, defaultDateRangeDays) {
  if (filters.dateFrom && filters.dateTo && !filters.datePreset) return true
  if (!filters.datePreset) return false
  return String(filters.datePreset) !== String(defaultDateRangeDays ?? 30)
}

function hasActiveFilters(filters, defaultDateRangeDays) {
  return Boolean(
    isDateDirty(filters, defaultDateRangeDays) ||
      filters.studioId ||
      filters.teacherId ||
      filters.programId ||
      filters.leadSource ||
      filters.comparison ||
      filters.groupBy ||
      filters.activeWindowDays
  )
}

export function ReportFilterBar({
  filters,
  onChange,
  studios = [],
  teachers = [],
  programs = [],
  leadSources = [],
  showLeadSource = true,
  showComparison = false,
  showActiveWindow = false,
  showGroupBy = false,
  defaultActiveWindowDays = 30,
  defaultDateRangeDays = 30,
  timeZone,
  footer = null,
}) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value })
  const defaultDays = defaultDateRangeDays ?? 30
  const [clearToken, setClearToken] = useState(0)

  const dateRangeValue = filters.datePreset
    ? Number(filters.datePreset)
    : filters.dateFrom && filters.dateTo
      ? { from: filters.dateFrom, to: filters.dateTo }
      : defaultDateRangeDays

  const dirty = hasActiveFilters(filters, defaultDays)

  function clearAllFilters() {
    const bounds = dateBoundsFromPresetDays(defaultDays, timeZone)
    onChange({
      ...filters,
      ...bounds,
      datePreset: String(defaultDays),
      studioId: '',
      teacherId: '',
      programId: '',
      leadSource: '',
      comparison: '',
      groupBy: '',
      activeWindowDays: '',
      status: '',
    })
    setClearToken((token) => token + 1)
  }

  const footerContent =
    typeof footer === 'function'
      ? footer({ clearFilters: clearAllFilters, clearToken })
      : footer

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border/80 bg-card/80 shadow-sm">
      <div className="p-3 sm:p-3.5">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-3">
          <FilterField label="Period">
            <DateRangePresets
              value={dateRangeValue}
              defaultDays={defaultDays}
              onChange={(next) => {
                if (typeof next === 'number') {
                  const bounds = dateBoundsFromPresetDays(next, timeZone)
                  onChange({
                    ...filters,
                    ...bounds,
                    datePreset: String(next),
                  })
                  return
                }
                if (typeof next === 'object' && next.from && next.to) {
                  onChange({
                    ...filters,
                    dateFrom: next.from,
                    dateTo: next.to,
                    datePreset: '',
                  })
                }
              }}
            />
          </FilterField>

          <FilterSelect
            label="Studio"
            value={filters.studioId}
            onValueChange={set('studioId')}
            options={studios}
            placeholder="All studios"
          />
          <FilterSelect
            label="Teacher"
            value={filters.teacherId}
            onValueChange={set('teacherId')}
            options={teachers}
            placeholder="All teachers"
          />
          <FilterSelect
            label="Package"
            value={filters.programId}
            onValueChange={set('programId')}
            options={programs}
            placeholder="All packages"
          />
          {showLeadSource && (
            <FilterSelect
              label="Lead Source"
              value={filters.leadSource}
              onValueChange={set('leadSource')}
              options={leadSources}
              placeholder="All sources"
            />
          )}
          {showComparison && (
            <FilterSelect
              label="Comparison"
              value={filters.comparison}
              onValueChange={set('comparison')}
              options={[
                { id: 'mom', label: 'Month over Month' },
                { id: 'yoy', label: 'Year over Year' },
              ]}
              placeholder="Off"
            />
          )}
          {showGroupBy && (
            <FilterSelect
              label="Group By"
              value={filters.groupBy}
              onValueChange={set('groupBy')}
              options={[
                { id: 'teacher', label: 'Teacher' },
                { id: 'studio', label: 'Studio' },
                { id: 'program', label: 'Program' },
              ]}
              placeholder="Teacher"
            />
          )}
          {showActiveWindow && (
            <FilterField label="Active window" htmlFor="activeWindowDays">
              <Input
                id="activeWindowDays"
                type="number"
                min={1}
                className={FILTER_CONTROL_CLASS + ' w-28'}
                placeholder={String(defaultActiveWindowDays)}
                value={filters.activeWindowDays || ''}
                onChange={(e) => set('activeWindowDays')(e.target.value)}
              />
            </FilterField>
          )}

          {dirty && (
            <div className="flex flex-col gap-1.5">
              <span className="invisible text-[11px] font-semibold uppercase tracking-[0.04em]">
                Clear
              </span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[12px] font-medium text-foreground/70 shadow-sm transition-colors hover:border-[var(--studio-primary)]/30 hover:bg-[var(--studio-primary)]/5 hover:text-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Clear filters
              </button>
            </div>
          )}
        </div>
      </div>

      {footerContent ? (
        <div className="border-t border-border/70 bg-muted/25 px-3 py-3 sm:px-3.5">
          {footerContent}
        </div>
      ) : null}
    </div>
  )
}
