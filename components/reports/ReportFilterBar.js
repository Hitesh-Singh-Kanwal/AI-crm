'use client'

import DateRangePresets from '@/components/dashboard-builder/DateRangePresets'
import { Select } from '@/components/ui/select'

function FilterSelect({ label, value, onValueChange, options, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground" htmlFor={label}>{label}</label>
      <Select
        id={label}
        className="h-9 w-44"
        value={value || ''}
        onChange={(e) => onValueChange(e.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </Select>
    </div>
  )
}

export function ReportFilterBar({ filters, onChange, studios, teachers, programs, leadSources, showLeadSource = true }) {
  const set = (key) => (value) => onChange({ ...filters, [key]: value })

  const dateRangeValue = filters.dateFrom && filters.dateTo ? { from: filters.dateFrom, to: filters.dateTo } : 30

  return (
    <div className="flex flex-wrap items-end gap-3">
      <DateRangePresets
        value={dateRangeValue}
        onChange={(next) => {
          if (typeof next === 'object' && next.from && next.to) {
            onChange({ ...filters, dateFrom: next.from, dateTo: next.to })
          }
        }}
      />
      <FilterSelect label="Studio" value={filters.studioId} onValueChange={set('studioId')} options={studios} placeholder="All studios" />
      <FilterSelect label="Teacher" value={filters.teacherId} onValueChange={set('teacherId')} options={teachers} placeholder="All teachers" />
      <FilterSelect label="Program" value={filters.programId} onValueChange={set('programId')} options={programs} placeholder="All programs" />
      {showLeadSource && (
        <FilterSelect label="Lead Source" value={filters.leadSource} onValueChange={set('leadSource')} options={leadSources} placeholder="All sources" />
      )}
    </div>
  )
}
