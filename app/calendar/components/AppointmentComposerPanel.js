'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import api from '@/lib/api'

function bumpHour(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const next = Math.min(h + 1, 23)
  return `${String(next).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
}

const TABS = ['Appointment', 'Group Class', 'To Do', 'Record Only']

const TAB_TYPE_MAP = {
  'Appointment': 'private',
  'Group Class': 'lesson',
  'To Do': 'event',
  'Record Only': 'lesson',
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-11 px-3 text-[12px] font-medium border-b-2 transition-colors',
        active
          ? 'text-foreground border-primary'
          : 'text-muted-foreground border-transparent hover:text-foreground',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function Label({ children }) {
  return <label className="block mb-1.5 text-[12px] font-medium text-foreground">{children}</label>
}

function Input({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
    />
  )
}

function DateInput({ value, onChange }) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
    />
  )
}

function MultiSelect({ values = [], onChange, options = [], placeholder }) {
  const selected = new Set(values)
  const available = options.filter((o) => !selected.has(o.value))
  const selectedOptions = options.filter((o) => selected.has(o.value))

  function add(val) {
    if (val && !selected.has(val)) onChange?.([...values, val])
  }
  function remove(val) {
    onChange?.(values.filter((v) => v !== val))
  }

  return (
    <div className="rounded-lg border border-border bg-background focus-within:border-primary">
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-2 pt-2">
          {selectedOptions.map((opt) => (
            <span key={opt.value} className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
              {opt.label}
              <button type="button" onClick={() => remove(opt.value)} className="ml-0.5 leading-none hover:text-brand/70">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <select
          value=""
          onChange={(e) => add(e.target.value)}
          className="h-10 w-full appearance-none bg-transparent px-3 pr-8 text-[12px] text-foreground outline-none"
        >
          <option value="">{available.length === 0 ? 'All selected' : placeholder}</option>
          {available.map((opt, i) => (
            <option key={opt.value != null ? opt.value : i} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )
}

function Select({ value, onChange, options = [], placeholder }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 text-[12px] text-foreground outline-none focus:border-primary"
      >
        <option value="">{placeholder}</option>
        {options.map((opt, i) => (
          <option key={opt.value != null ? opt.value : i} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

function TextArea({ value, onChange, placeholder }) {
  return (
    <textarea
      rows={3}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary"
    />
  )
}

function TimeRangeField({ startValue, endValue, onStartChange, onEndChange }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <input
        type="time"
        value={startValue}
        onChange={(e) => onStartChange?.(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
      />
      <span className="text-[12px] text-muted-foreground">to</span>
      <input
        type="time"
        value={endValue}
        onChange={(e) => onEndChange?.(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary"
      />
    </div>
  )
}

function CreditsChip({ credits }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
      {credits} {credits === 1 ? 'credit' : 'credits'}
    </span>
  )
}

function TypeField({ value, onChange }) {
  return (
    <div>
      <Label>Type</Label>
      <Select value={value} onChange={onChange} options={TYPE_OPTIONS} placeholder="Select Type" />
    </div>
  )
}

function AppointmentFields({ form, setField, instructorOptions, customerOptions, lessonOptions, lessonMap }) {
  const selectedLesson = form.lesson_id ? lessonMap[form.lesson_id] : null
  const lessonCredits = selectedLesson?.credits ?? null

  function handleLessonChange(id) {
    setField('lesson_id', id)
    const lesson = lessonMap[id]
    if (lesson?.name) setField('title', lesson.name)
  }

  return (
    <>
      <h3 className="mb-4 text-[14px] font-semibold text-foreground">Individual Appointment</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Title</Label>
          <Input
            value={form.title}
            onChange={(v) => setField('title', v)}
            placeholder="e.g. Ballet Trial Class"
          />
        </div>

        {/* Lesson selector */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-medium text-foreground">Lesson</label>
            {lessonCredits !== null && <CreditsChip credits={lessonCredits} />}
          </div>
          <Select
            value={form.lesson_id}
            onChange={handleLessonChange}
            options={lessonOptions}
            placeholder="Select Lesson"
          />
        </div>

        <div>
          <Label>Instructor</Label>
          <Select
            value={form.instructor_id}
            onChange={(v) => setField('instructor_id', v)}
            options={instructorOptions}
            placeholder="Select Instructor"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-medium text-foreground">Customer</label>
            {lessonCredits !== null && (
              <span className="text-[11px] text-muted-foreground">costs {lessonCredits} credits</span>
            )}
          </div>
          <Select
            value={form.customer_id}
            onChange={(v) => setField('customer_id', v)}
            options={customerOptions}
            placeholder="Select Customer"
          />
        </div>

        <TypeField value={form.type} onChange={(v) => setField('type', v)} />

        <div>
          <Label>Date</Label>
          <DateInput value={form.date} onChange={(v) => setField('date', v)} />
        </div>
        <div>
          <Label>Time</Label>
          <TimeRangeField
            startValue={form.start_time}
            endValue={form.end_time}
            onStartChange={(v) => setField('start_time', v)}
            onEndChange={(v) => setField('end_time', v)}
          />
        </div>

        <div className="col-span-2">
          <div className="flex items-center justify-between mb-2">
            <Label>Repeat</Label>
            <button
              type="button"
              onClick={() => setField('recurrence_enabled', !form.recurrence_enabled)}
              className={[
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                form.recurrence_enabled ? 'bg-brand' : 'bg-muted',
              ].join(' ')}
              role="switch"
              aria-checked={form.recurrence_enabled}
            >
              <span
                className={[
                  'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform',
                  form.recurrence_enabled ? 'translate-x-4' : 'translate-x-0',
                ].join(' ')}
              />
            </button>
          </div>
          {form.recurrence_enabled && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-muted/30 p-3">
              <div>
                <Label>Frequency</Label>
                <Select
                  value={form.recurrence_frequency}
                  onChange={(v) => setField('recurrence_frequency', v)}
                  options={FREQUENCY_OPTIONS}
                  placeholder="Select frequency"
                />
              </div>
              <div>
                <Label>Repeat until</Label>
                <DateInput
                  value={form.recurrence_end_date}
                  onChange={(v) => setField('recurrence_end_date', v)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="col-span-2">
          <Label>Notes</Label>
          <TextArea
            value={form.public_note}
            onChange={(v) => setField('public_note', v)}
            placeholder="Enter your note here"
          />
        </div>
      </div>
    </>
  )
}

function ToDoFields({ form, setField, instructorOptions }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <h3 className="col-span-2 mb-1 text-[14px] font-semibold text-foreground">To Do</h3>
      <div className="col-span-2">
        <Label>Title</Label>
        <Input value={form.title} onChange={(v) => setField('title', v)} placeholder="Study" />
      </div>
      <div>
        <Label>Instructor</Label>
        <Select
          value={form.instructor_id}
          onChange={(v) => setField('instructor_id', v)}
          options={instructorOptions}
          placeholder="Select Instructor"
        />
      </div>
      <TypeField value={form.type} onChange={(v) => setField('type', v)} />
      <div className="col-span-2 grid grid-cols-2 gap-3">
        <div>
          <Label>Date</Label>
          <DateInput value={form.date} onChange={(v) => setField('date', v)} />
        </div>
        <div>
          <Label>Time</Label>
          <TimeRangeField
            startValue={form.start_time}
            endValue={form.end_time}
            onStartChange={(v) => setField('start_time', v)}
            onEndChange={(v) => setField('end_time', v)}
          />
        </div>
      </div>
      <div className="col-span-2">
        <Label>Description</Label>
        <TextArea
          value={form.description}
          onChange={(v) => setField('description', v)}
          placeholder="Enter your description here"
        />
      </div>
    </div>
  )
}

function GroupClassFields({ form, setField, instructorOptions, customerOptions, lessonOptions, lessonMap }) {
  const selectedLesson = form.lesson_id ? lessonMap[form.lesson_id] : null
  const lessonCredits = selectedLesson?.credits ?? null

  function handleLessonChange(id) {
    setField('lesson_id', id)
    const lesson = lessonMap[id]
    if (lesson?.name) setField('group_name', lesson.name)
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <h3 className="col-span-2 mb-1 text-[14px] font-semibold text-foreground">Group Class</h3>
      <div className="col-span-2">
        <Label>Group Name</Label>
        <Input
          value={form.group_name}
          onChange={(v) => setField('group_name', v)}
          placeholder="Enter Group Name"
        />
      </div>

      {/* Lesson selector */}
      <div className="col-span-2">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] font-medium text-foreground">Lesson</label>
          {lessonCredits !== null && <CreditsChip credits={lessonCredits} />}
        </div>
        <Select
          value={form.lesson_id}
          onChange={handleLessonChange}
          options={lessonOptions}
          placeholder="Select Lesson"
        />
      </div>

      <TypeField value={form.type} onChange={(v) => setField('type', v)} />
      <div className="col-span-2">
        <Label>Instructor</Label>
        <Select
          value={form.instructor_id}
          onChange={(v) => setField('instructor_id', v)}
          options={instructorOptions}
          placeholder="Select Instructor"
        />
      </div>
      <div className="col-span-2">
        <Label>Customers</Label>
        <MultiSelect
          values={form.customer_ids}
          onChange={(v) => setField('customer_ids', v)}
          options={customerOptions}
          placeholder="Select Customers"
        />
      </div>
      <div>
        <Label>Date</Label>
        <DateInput value={form.date} onChange={(v) => setField('date', v)} />
      </div>
      <div className="col-span-2">
        <Label>Time</Label>
        <TimeRangeField
          startValue={form.start_time}
          endValue={form.end_time}
          onStartChange={(v) => setField('start_time', v)}
          onEndChange={(v) => setField('end_time', v)}
        />
      </div>
      <div className="col-span-2">
        <Label>Notes</Label>
        <TextArea
          value={form.public_note}
          onChange={(v) => setField('public_note', v)}
          placeholder="Enter your note here"
        />
      </div>
    </div>
  )
}

function RecordOnlyFields({ form, setField, instructorOptions, customerOptions, lessonOptions, lessonMap }) {
  const selectedLesson = form.lesson_id ? lessonMap[form.lesson_id] : null
  const lessonCredits = selectedLesson?.credits ?? null

  function handleLessonChange(id) {
    setField('lesson_id', id)
    const lesson = lessonMap[id]
    if (lesson?.name) setField('title', lesson.name)
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <h3 className="col-span-2 mb-1 text-[14px] font-semibold text-foreground">Record Only</h3>

      {/* Lesson selector */}
      <div className="col-span-2">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] font-medium text-foreground">Lesson</label>
          {lessonCredits !== null && <CreditsChip credits={lessonCredits} />}
        </div>
        <Select
          value={form.lesson_id}
          onChange={handleLessonChange}
          options={lessonOptions}
          placeholder="Select Lesson"
        />
      </div>

      <div>
        <Label>Instructor</Label>
        <Select
          value={form.instructor_id}
          onChange={(v) => setField('instructor_id', v)}
          options={instructorOptions}
          placeholder="Select Instructor"
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[12px] font-medium text-foreground">Customer</label>
          {lessonCredits !== null && (
            <span className="text-[11px] text-muted-foreground">costs {lessonCredits} credits</span>
          )}
        </div>
        <Select
          value={form.customer_id}
          onChange={(v) => setField('customer_id', v)}
          options={customerOptions}
          placeholder="Select Customer"
        />
      </div>
      <TypeField value={form.type} onChange={(v) => setField('type', v)} />
      <div>
        <Label>Date</Label>
        <DateInput value={form.date} onChange={(v) => setField('date', v)} />
      </div>
      <div>
        <Label>Time</Label>
        <TimeRangeField
          startValue={form.start_time}
          endValue={form.end_time}
          onStartChange={(v) => setField('start_time', v)}
          onEndChange={(v) => setField('end_time', v)}
        />
      </div>
      <div className="col-span-2">
        <Label>Notes</Label>
        <TextArea
          value={form.internal_note}
          onChange={(v) => setField('internal_note', v)}
          placeholder="Enter your note here"
        />
      </div>
    </div>
  )
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]

const TYPE_OPTIONS = [
  { value: 'private', label: 'Private' },
  { value: 'lesson', label: 'Lesson' },
  { value: 'trial', label: 'Trial' },
  { value: 'event', label: 'Event' },
]

const EMPTY_FORM = {
  lesson_id: '',
  instructor_id: '',
  instructor_ids: [],
  customer_id: '',
  customer_ids: [],
  enrolment_id: '',
  scheduling_code: '',
  date: '',
  start_time: '',
  end_time: '',
  public_note: '',
  internal_note: '',
  title: '',
  type: '',
  status: '',
  description: '',
  group_name: '',
  service: '',
  recurrence_enabled: false,
  recurrence_frequency: 'weekly',
  recurrence_end_date: '',
}

export default function AppointmentComposerPanel({ onClose, onCreated, initialDate, initialTime }) {
  const [activeTab, setActiveTab] = useState('Appointment')
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    date: initialDate || '',
    start_time: initialTime || '',
    end_time: initialTime ? bumpHour(initialTime) : '',
  }))
  const [instructorOptions, setInstructorOptions] = useState([])
  const [customerOptions, setCustomerOptions] = useState([])
  const [lessonOptions, setLessonOptions] = useState([])
  const [lessonMap, setLessonMap] = useState({}) // id → lesson object
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  function handleTabChange(tab) {
    setActiveTab(tab)
    setField('type', TAB_TYPE_MAP[tab])
  }

  useEffect(() => {
    async function loadDropdownData() {
      const [usersResult, leadsResult, lessonsResult] = await Promise.all([
        api.get('/api/teacher?limit=200&status=active'),
        api.get('/api/customer?limit=200'),
        api.get('/api/lesson?limit=200'),
      ])

      if (usersResult.success && Array.isArray(usersResult.data)) {
        setInstructorOptions(
          usersResult.data.map((t) => ({
            value: String(t._id ?? t.id),
            label: t.name || t.email || String(t._id ?? t.id),
          }))
        )
      }

      if (leadsResult.success && Array.isArray(leadsResult.data)) {
        setCustomerOptions(
          leadsResult.data.map((c) => ({
            value: String(c._id ?? c.id),
            label: c.name || c.email || String(c._id ?? c.id),
          }))
        )
      }

      if (lessonsResult.success && Array.isArray(lessonsResult.data)) {
        const lessons = lessonsResult.data
        const map = {}
        lessons.forEach((l) => { map[String(l._id)] = l })
        setLessonMap(map)
        setLessonOptions(
          lessons.map((l) => ({
            value: String(l._id),
            label: l.credits != null ? `${l.name} (${l.credits} credits)` : l.name,
          }))
        )
      }
    }

    loadDropdownData()
  }, [])

  const handleSave = async () => {
    setError(null)
    setIsSaving(true)

    const startDateTime = form.date && form.start_time
      ? new Date(`${form.date}T${form.start_time}`).toISOString()
      : undefined
    const endDateTime = form.date && form.end_time
      ? new Date(`${form.date}T${form.end_time}`).toISOString()
      : undefined

    const payload = {
      title: form.title || form.group_name || form.scheduling_code || 'Appointment',
      type: form.type || TAB_TYPE_MAP[activeTab],
      teacherID: form.instructor_id || undefined,
      customerIDs: activeTab === 'Group Class'
        ? (form.customer_ids.length ? form.customer_ids : undefined)
        : (form.customer_id ? [form.customer_id] : undefined),
      lessonID: form.lesson_id || undefined,
      startDateTime,
      endDateTime,
      notes: [form.public_note, form.internal_note].filter(Boolean).join('\n') || undefined,
      description: form.description || undefined,
      recurrence: form.recurrence_enabled && form.recurrence_frequency && form.recurrence_end_date
        ? { enabled: true, frequency: form.recurrence_frequency, endDate: form.recurrence_end_date }
        : { enabled: false },
    }

    const result = await api.post('/api/calendar', payload)

    if (result.success) {
      onCreated?.()
      onClose()
    } else {
      setError(result.error || 'Failed to save appointment.')
    }

    setIsSaving(false)
  }

  const tabContent = useMemo(() => {
    if (activeTab === 'Appointment') {
      return (
        <AppointmentFields
          form={form}
          setField={setField}
          instructorOptions={instructorOptions}
          customerOptions={customerOptions}
          lessonOptions={lessonOptions}
          lessonMap={lessonMap}
        />
      )
    }
    if (activeTab === 'To Do') {
      return <ToDoFields form={form} setField={setField} instructorOptions={instructorOptions} />
    }
    if (activeTab === 'Group Class') {
      return (
        <GroupClassFields
          form={form}
          setField={setField}
          instructorOptions={instructorOptions}
          customerOptions={customerOptions}
          lessonOptions={lessonOptions}
          lessonMap={lessonMap}
        />
      )
    }
    return (
      <RecordOnlyFields
        form={form}
        setField={setField}
        instructorOptions={instructorOptions}
        customerOptions={customerOptions}
        lessonOptions={lessonOptions}
        lessonMap={lessonMap}
      />
    )
  }, [activeTab, form, instructorOptions, customerOptions, lessonOptions, lessonMap])

  return (
    <aside className="h-full w-[430px] shrink-0 rounded-xl border border-border bg-card shadow-lg">
      <div className="flex items-center justify-between border-b border-border pr-1">
        <div className="flex items-center overflow-x-auto">
          {TABS.map((tab) => (
            <TabButton key={tab} label={tab} active={activeTab === tab} onClick={() => handleTabChange(tab)} />
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close appointment panel"
          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex h-[calc(100%-44px)] flex-col">
        <div className="flex-1 overflow-y-auto p-4">{tabContent}</div>

        {error && (
          <div className="mx-4 mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-border bg-background text-[12px] font-semibold text-foreground hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 rounded-lg bg-brand text-[12px] font-semibold text-brand-foreground hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </aside>
  )
}
