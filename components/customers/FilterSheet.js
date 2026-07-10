'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

const FILTER_TYPES = [
  { id: 'visits', label: 'Visits' },
  { id: 'futureBookings', label: 'Future bookings' },
  { id: 'joinDate', label: 'Join date' },
  { id: 'location', label: 'Location' },
  { id: 'lastContacted', label: 'Last contacted' },
  { id: 'membership', label: 'Membership' },
  { id: 'birthday', label: 'Birthday month' },
  { id: 'age', label: 'Customer age' },
  { id: 'tags', label: 'Customer tags' },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const NUMBER_OPERATORS = [
  { value: 'gt', label: 'Greater than' },
  { value: 'lt', label: 'Less than' },
  { value: 'eq', label: 'Equal to' },
  { value: 'between', label: 'Between' },
]

const DATE_OPERATORS = [
  { value: 'before', label: 'Before' },
  { value: 'after', label: 'After' },
  { value: 'between', label: 'Between' },
  { value: 'lastNDays', label: 'In the last (days)' },
]

function defaultValueForType(type) {
  switch (type) {
    case 'visits':
    case 'age':
      return { operator: 'gt', value: '', value2: '' }
    case 'futureBookings':
      return { operator: 'has' }
    case 'joinDate':
    case 'lastContacted':
      return { operator: 'before', value: '', value2: '' }
    case 'location':
      return { value: '' }
    case 'membership':
      return { name: '', status: '' }
    case 'birthday':
      return { month: '' }
    case 'tags':
      return { match: 'any', value: [] }
    default:
      return {}
  }
}

function isFilterConfigured(type, config) {
  switch (type) {
    case 'visits':
    case 'age':
      return config.operator === 'between'
        ? config.value !== '' && config.value2 !== ''
        : config.value !== ''
    case 'futureBookings':
      return true
    case 'joinDate':
    case 'lastContacted':
      return config.operator === 'between'
        ? config.value !== '' && config.value2 !== ''
        : config.value !== ''
    case 'location':
      return config.value !== ''
    case 'membership':
      return config.name !== '' || config.status !== ''
    case 'birthday':
      return config.month !== ''
    case 'tags':
      return config.value.length > 0
    default:
      return false
  }
}

function NumberField({ value, onChange, placeholder }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-8 w-24 rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-primary"
    />
  )
}

function DateField({ value, onChange }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-lg border border-border bg-background px-2 text-[12px] text-foreground outline-none focus:border-primary"
    />
  )
}

function Select({ value, onChange, options, placeholder, className }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-8 appearance-none rounded-lg border border-border bg-background pl-2 pr-6 text-[12px] text-foreground outline-none focus:border-primary',
          className
        )}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

function SubFilter({ type, config, onChange, locations, membershipNames, tagOptions }) {
  const set = (patch) => onChange({ ...config, ...patch })

  if (type === 'visits' || type === 'age') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Select value={config.operator} onChange={(v) => set({ operator: v })} options={NUMBER_OPERATORS} />
        <NumberField value={config.value} onChange={(v) => set({ value: v })} placeholder="0" />
        {config.operator === 'between' && (
          <>
            <span className="text-[12px] text-muted-foreground">and</span>
            <NumberField value={config.value2} onChange={(v) => set({ value2: v })} placeholder="0" />
          </>
        )}
      </div>
    )
  }

  if (type === 'futureBookings') {
    return (
      <Select
        value={config.operator}
        onChange={(v) => set({ operator: v })}
        options={[
          { value: 'has', label: 'Has upcoming bookings' },
          { value: 'none', label: 'Has no upcoming bookings' },
        ]}
      />
    )
  }

  if (type === 'joinDate' || type === 'lastContacted') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Select value={config.operator} onChange={(v) => set({ operator: v })} options={DATE_OPERATORS} />
        {config.operator === 'lastNDays' ? (
          <NumberField value={config.value} onChange={(v) => set({ value: v })} placeholder="30" />
        ) : (
          <>
            <DateField value={config.value} onChange={(v) => set({ value: v })} />
            {config.operator === 'between' && (
              <>
                <span className="text-[12px] text-muted-foreground">and</span>
                <DateField value={config.value2} onChange={(v) => set({ value2: v })} />
              </>
            )}
          </>
        )}
      </div>
    )
  }

  if (type === 'location') {
    return (
      <Select
        value={config.value}
        onChange={(v) => set({ value: v })}
        placeholder={locations.length ? 'Select location…' : 'No locations found'}
        options={locations.map((l) => ({ value: l._id, label: l.name }))}
        className="w-full"
      />
    )
  }

  if (type === 'membership') {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={config.name}
          onChange={(v) => set({ name: v })}
          placeholder={membershipNames.length ? 'Any membership' : 'No memberships found'}
          options={membershipNames.map((n) => ({ value: n, label: n }))}
          className="min-w-[160px]"
        />
        <Select
          value={config.status}
          onChange={(v) => set({ status: v })}
          placeholder="Any status"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'expired', label: 'Expired' },
            { value: 'cancelled', label: 'Cancelled' },
          ]}
        />
      </div>
    )
  }

  if (type === 'birthday') {
    return (
      <Select
        value={config.month}
        onChange={(v) => set({ month: v })}
        placeholder="Select month…"
        options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
        className="w-full"
      />
    )
  }

  if (type === 'tags') {
    if (tagOptions.length === 0) {
      return <p className="text-[12px] text-muted-foreground">No tags have been added to any customer yet.</p>
    }
    const toggleTag = (tag) => {
      const has = config.value.includes(tag)
      set({ value: has ? config.value.filter((t) => t !== tag) : [...config.value, tag] })
    }
    return (
      <div className="space-y-2">
        <Select
          value={config.match}
          onChange={(v) => set({ match: v })}
          options={[
            { value: 'any', label: 'Match any selected tag' },
            { value: 'all', label: 'Match all selected tags' },
          ]}
        />
        <div className="flex flex-wrap gap-1.5">
          {tagOptions.map((tag) => {
            const active = config.value.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={cn(
                  'h-7 rounded-full border px-2.5 text-[11px] font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                )}
              >
                {tag}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return null
}

export default function FilterSheet({ open, onClose, onApply, locations = [], membershipNames = [], tagOptions = [] }) {
  const [mode, setMode] = useState('AND')
  const [selected, setSelected] = useState({})

  const toggle = (id) => {
    setSelected((prev) => {
      const next = { ...prev }
      if (next[id]) {
        delete next[id]
      } else {
        next[id] = defaultValueForType(id)
      }
      return next
    })
  }

  const updateConfig = (id, config) => {
    setSelected((prev) => ({ ...prev, [id]: config }))
  }

  const configuredFilters = Object.entries(selected).filter(([type, config]) => isFilterConfigured(type, config))

  const handleApply = () => {
    if (configuredFilters.length === 0) return
    const filters = configuredFilters.map(([type, config]) => ({ type, config }))
    onApply({ mode, filters })
    setSelected({})
    setMode('AND')
    onClose()
  }

  const handleClose = () => {
    setSelected({})
    setMode('AND')
    onClose()
  }

  return (
    <Sheet open={open} onClose={handleClose} width="480px">
      <SheetContent onClose={handleClose}>
        <SheetHeader>
          <SheetTitle>Filter Customers</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6 px-6 pb-4">
          {/* Step 1 */}
          <div>
            <p className="mb-2 text-[12px] font-semibold text-muted-foreground">Step 1 · Match type</p>
            <div className="flex gap-2">
              {['AND', 'OR'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'h-8 flex-1 rounded-lg border text-[12px] font-medium transition-colors',
                    mode === m
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/40'
                  )}
                >
                  Match {m === 'AND' ? 'all' : 'any'} ({m})
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 */}
          <div>
            <p className="mb-2 text-[12px] font-semibold text-muted-foreground">Step 2 · Select filters</p>
            <div className="space-y-1.5">
              {FILTER_TYPES.map(({ id, label }) => {
                const isOn = Boolean(selected[id])
                return (
                  <div key={id} className="rounded-lg border border-border overflow-hidden">
                    <div className="flex w-full items-center gap-2.5 px-3 py-2.5 hover:bg-muted/30">
                      <Checkbox checked={isOn} onClick={() => toggle(id)} />
                      <button
                        type="button"
                        onClick={() => toggle(id)}
                        className="flex flex-1 items-center gap-2 text-left"
                      >
                        <span className="flex-1 text-[13px] text-foreground">{label}</span>
                        {isOn ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    {isOn && (
                      <div className="border-t border-border bg-muted/20 px-3 py-3">
                        <SubFilter
                          type={id}
                          config={selected[id]}
                          onChange={(c) => updateConfig(id, c)}
                          locations={locations}
                          membershipNames={membershipNames}
                          tagOptions={tagOptions}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <SheetFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={configuredFilters.length === 0}>
            Apply filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
