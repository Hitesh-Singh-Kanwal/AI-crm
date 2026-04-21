'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import MainLayout from '@/components/layout/MainLayout'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import AppointmentComposerPanel from './components/AppointmentComposerPanel'
import EventDetailPanel from './components/EventDetailPanel'
import api from '@/lib/api'

const COLORS = {
  border: 'hsl(var(--border))',
  shadow: '0px 2px 5px 0px hsl(var(--foreground) / 0.06)',
}

// Visually distinct hues — works on both light and dark backgrounds
const CALENDAR_PALETTE = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ef4444', // red
]


const VIEW_MODE = { DAY: 'day', WEEK: 'week', MONTH: 'month' }
const FULLCALENDAR_VIEW = {
  [VIEW_MODE.DAY]: 'timeGridDay',
  [VIEW_MODE.WEEK]: 'timeGridWeek',
  [VIEW_MODE.MONTH]: 'dayGridMonth',
}
const DAY_START_HOUR = 6
const DAY_END_HOUR = 22
const DAY_ROW_HEIGHT = 64
const DAY_LEFT_RAIL_WIDTH = 86

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function mapViewTypeToMode(viewType) {
  if (viewType === 'timeGridDay') return VIEW_MODE.DAY
  if (viewType === 'timeGridWeek') return VIEW_MODE.WEEK
  return VIEW_MODE.MONTH
}

function isSameDate(a, b) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  )
}

function startOfWeekSunday(date) {
  const base = new Date(date)
  base.setDate(base.getDate() - base.getDay())
  base.setHours(0, 0, 0, 0)
  return base
}

function formatHeaderLabel(date, mode) {
  if (mode === VIEW_MODE.DAY) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (mode === VIEW_MODE.WEEK) {
    const start = startOfWeekSunday(date)
    const end = addDays(start, 6)
    if (start.getMonth() === end.getMonth()) {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    }
    return `${start.toLocaleDateString('en-US', { month: 'short' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
  }

  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}


function deriveInstructors(appointments) {
  const seen = {}
  let colorIdx = 0
  appointments.forEach((appt) => {
    const id = String(appt.teacherID?._id || appt.teacherID || '')
    const name = appt.teacherID?.name || ''
    if (id && id !== 'undefined' && !seen[id]) {
      const parts = name.trim().split(/\s+/)
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : (name.slice(0, 2) || '??').toUpperCase()
      seen[id] = {
        key: id,
        initials,
        name,
        color: CALENDAR_PALETTE[colorIdx % CALENDAR_PALETTE.length],
      }
      colorIdx += 1
    }
  })
  return Object.values(seen)
}

function buildColorMap(instructors) {
  const map = {}
  instructors.forEach((inst) => { map[inst.key] = inst.color })
  return map
}

function transformAppointments(appointments, colorMap) {
  return appointments.map((appt) => {
    const teacherId = String(appt.teacherID?._id || appt.teacherID || 'unknown')
    const teacherName = appt.teacherID?.name || ''
    const color = colorMap?.[teacherId] || CALENDAR_PALETTE[0]

    const start = new Date(appt.startDateTime)
    const end = new Date(appt.endDateTime)
    const isAllDay = Boolean(appt.allDay)
    const isCancelled = appt.status === 'cancelled'

    const customerNames = Array.isArray(appt.customerIDs)
      ? appt.customerIDs.map((c) => (typeof c === 'object' ? c.name || c.email : '')).filter(Boolean)
      : []

    return {
      id: String(appt._id || appt.id),
      title: appt.title || 'Event',
      start,
      end,
      allDay: isAllDay,
      backgroundColor: isAllDay ? 'var(--studio-primary)' : 'transparent',
      borderColor: 'transparent',
      textColor: isAllDay ? 'rgb(var(--studio-on-primary-rgb))' : 'inherit',
      extendedProps: {
        tutorName: teacherName,
        tutorKey: teacherId,
        status: appt.status,
        color: isCancelled ? 'hsl(var(--muted-foreground))' : color,
        customerNames,
        eventType: appt.type,
        raw: appt,
      },
    }
  })
}

function SegmentedButton({ active, children, className, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-10 px-4 text-[12px] leading-none select-none bg-background border border-border',
        active ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
        className,
      ].filter(Boolean).join(' ')}
      style={{ boxShadow: COLORS.shadow }}
    >
      {children}
    </button>
  )
}

function IconCircleButton({ children, ariaLabel, onClick }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="h-10 w-10 rounded-full bg-background border border-border grid place-items-center"
      style={{ boxShadow: COLORS.shadow }}
    >
      {children}
    </button>
  )
}

function SmallRoundedButton({ children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-10 rounded-[20px] px-4 bg-background border border-border text-[12px] font-bold text-muted-foreground"
      style={{ boxShadow: COLORS.shadow }}
    >
      {children}
    </button>
  )
}

const EVENT_TYPE_LABEL = {
  private: 'Appt',
  lesson: 'Group',
  trial: 'Trial',
  event: 'To Do',
}

function TypeBadge({ type }) {
  if (!type) return null
  const label = EVENT_TYPE_LABEL[type] ?? type
  return (
    <span className="shrink-0 rounded px-1 py-px text-[8px] font-bold uppercase leading-none bg-black/10 text-foreground/70">
      {label}
    </span>
  )
}

function renderEventContent(info) {
  const { tutorName, status, color, customerNames, eventType } = info.event.extendedProps || {}
  const cancelled = status === 'cancelled'
  const accentColor = color || 'var(--studio-primary)'

  if (info.event.allDay) {
    return (
      <div
        className="h-full w-full px-2 py-0.5 flex items-center rounded text-[10px] font-semibold truncate"
        style={{ backgroundColor: 'var(--studio-primary)', color: 'rgb(var(--studio-on-primary-rgb))' }}
      >
        {info.event.title}
      </div>
    )
  }

  const durationMins = info.event.end && info.event.start
    ? (info.event.end - info.event.start) / 60000
    : 60

  const fmt = (d) => d
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : ''

  const startLabel = fmt(info.event.start)
  const endLabel = fmt(info.event.end)
  const timeRange = startLabel && endLabel ? `${startLabel} – ${endLabel}` : startLabel

  const durationLabel = (() => {
    if (durationMins < 60) return `${durationMins}m`
    const h = Math.floor(durationMins / 60)
    const m = durationMins % 60
    return m ? `${h}h ${m}m` : `${h}h`
  })()

  // thresholds: <30 min → title only; 30–44 min → title + time; 45+ → all details
  const showTime = durationMins >= 30
  const showDetails = durationMins >= 45

  const initials = (tutorName || '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  const customersLabel = Array.isArray(customerNames) && customerNames.length > 0
    ? customerNames.join(', ')
    : null

  return (
    <div
      className={`h-full w-full overflow-hidden rounded-[5px] flex flex-col ${cancelled ? 'opacity-50' : ''}`}
      style={{
        borderLeft: `3px solid ${accentColor}`,
        backgroundColor: `color-mix(in srgb, ${accentColor} 28%, hsl(var(--card)))`,
      }}
    >
      <div className="px-1.5 py-0.5 flex flex-col overflow-hidden h-full">
        <div className="flex items-center gap-1 min-w-0">
          <span className={`text-[10px] font-bold text-foreground leading-tight truncate ${cancelled ? 'line-through' : ''}`}>
            {info.event.title}
          </span>
          <TypeBadge type={eventType} />
        </div>
        {showTime && timeRange && (
          <div className="text-[9px] text-muted-foreground leading-tight truncate">{timeRange}</div>
        )}
        {showTime && (
          <div className="text-[9px] text-muted-foreground/70 leading-tight">{durationLabel}</div>
        )}
        {showDetails && customersLabel && (
          <div className="text-[9px] text-foreground/70 leading-tight truncate">{customersLabel}</div>
        )}
        {showDetails && tutorName && (
          <div className="flex items-center gap-1 mt-auto pb-0.5">
            <span
              className="h-3 w-3 rounded-full text-[7px] font-bold grid place-items-center text-white shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              {initials.charAt(0)}
            </span>
            <span className="text-[8px] text-muted-foreground truncate">{tutorName}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function formatHourLabel(hour24) {
  if (hour24 === 0) return '12 AM'
  if (hour24 < 12) return `${hour24} AM`
  if (hour24 === 12) return '12 PM'
  return `${hour24 - 12} PM`
}

function formatTime(dateInput) {
  const date = new Date(dateInput)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function layoutOverlappingEvents(events) {
  const sorted = [...events].sort((a, b) => new Date(a.start) - new Date(b.start) || new Date(a.end) - new Date(b.end))
  const active = []
  const laidOut = []
  let maxLanes = 1

  sorted.forEach((event) => {
    const eventStart = new Date(event.start)
    for (let i = active.length - 1; i >= 0; i--) {
      if (new Date(active[i].end) <= eventStart) active.splice(i, 1)
    }

    const used = new Set(active.map((e) => e.lane))
    let lane = 0
    while (used.has(lane)) lane += 1

    const withLane = { ...event, lane }
    active.push(withLane)
    laidOut.push(withLane)
    maxLanes = Math.max(maxLanes, active.length, lane + 1)
  })

  return laidOut.map((event) => ({ ...event, totalLanes: maxLanes }))
}

const UNASSIGNED_KEY = '__unassigned__'

function deriveTutorsFromEvents(events, passedTutors) {
  if (passedTutors.length > 0) return passedTutors
  const seen = {}
  events.forEach((event) => {
    const key = event.extendedProps?.tutorKey || UNASSIGNED_KEY
    if (!seen[key]) {
      const name = event.extendedProps?.tutorName || (key === UNASSIGNED_KEY ? 'Unassigned' : key)
      const parts = name.trim().split(/\s+/)
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : (name.slice(0, 2) || '??').toUpperCase()
      seen[key] = {
        key,
        name,
        initials,
        color: key === UNASSIGNED_KEY ? 'hsl(var(--muted-foreground))' : (event.extendedProps?.color || CALENDAR_PALETTE[0]),
      }
    }
  })
  return Object.values(seen)
}

function TutorDayCalendar({ focusDate, now, dayTimedEvents, dayAllDayEvents, tutors, onEventClick, onSlotClick }) {
  const dayHeight = (DAY_END_HOUR - DAY_START_HOUR) * DAY_ROW_HEIGHT
  const startMinutes = DAY_START_HOUR * 60

  const effectiveTutors = useMemo(() => {
    const derived = deriveTutorsFromEvents([...dayTimedEvents, ...dayAllDayEvents], tutors)
    // Always show at least one column so the grid is clickable even with no events
    if (derived.length === 0) return [{ key: UNASSIGNED_KEY, name: '', initials: '', color: 'hsl(var(--muted-foreground))' }]
    return derived
  }, [dayTimedEvents, dayAllDayEvents, tutors])

  const byTutorTimed = useMemo(() => {
    const map = {}
    effectiveTutors.forEach((tutor) => {
      const filtered = dayTimedEvents.filter((event) => {
        const key = event.extendedProps?.tutorKey || UNASSIGNED_KEY
        return key === tutor.key
      })
      map[tutor.key] = layoutOverlappingEvents(filtered)
    })
    return map
  }, [dayTimedEvents, effectiveTutors])

  const byTutorAllDay = useMemo(() => {
    const map = {}
    effectiveTutors.forEach((tutor) => {
      map[tutor.key] = dayAllDayEvents.filter((event) => {
        const key = event.extendedProps?.tutorKey || UNASSIGNED_KEY
        return key === tutor.key
      })
    })
    return map
  }, [dayAllDayEvents, effectiveTutors])

  const isToday = isSameDate(focusDate, now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const endMinutes = DAY_END_HOUR * 60
  const nowOffset = isToday && nowMinutes >= startMinutes && nowMinutes <= endMinutes
    ? ((nowMinutes - startMinutes) / 60) * DAY_ROW_HEIGHT
    : null

  const handleColumnClick = (e) => {
    // Don't fire if clicking an existing event
    if (e.target.closest('[data-event]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const totalMinutes = startMinutes + Math.round((y / DAY_ROW_HEIGHT) * 60 / 30) * 30
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    const clampedHours = Math.min(Math.max(hours, DAY_START_HOUR), DAY_END_HOUR - 1)
    const time = `${String(clampedHours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
    const dateStr = focusDate.toLocaleDateString('en-CA') // YYYY-MM-DD
    onSlotClick?.({ date: dateStr, time })
  }

  return (
    <div className="h-full overflow-auto rounded-[12px] border border-border bg-background">
      <div style={{ minWidth: DAY_LEFT_RAIL_WIDTH + effectiveTutors.length * 180 }}>
        <div className="sticky top-0 z-20 flex h-16 border-b border-border bg-background">
          <div className="w-[86px] shrink-0 border-r border-border px-2 py-2 text-[10px] font-medium text-muted-foreground">
            Teachers
          </div>
          {effectiveTutors.map((tutor, idx) => (
            <div
              key={tutor.key}
              className="flex-1 px-2 py-2"
              style={{ borderRight: idx < effectiveTutors.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}
            >
              <div className="flex items-center justify-center gap-2">
                <span
                  className="inline-grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-brand-foreground"
                  style={{ backgroundColor: tutor.color }}
                >
                  {tutor.initials}
                </span>
                <span className="truncate text-[11px] font-semibold text-foreground">{tutor.name}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex h-10 border-b border-border bg-muted/40">
          <div className="w-[86px] shrink-0 border-r border-border px-2 py-2 text-[10px] font-medium text-muted-foreground">All day</div>
          {effectiveTutors.map((tutor, idx) => (
            <div
              key={`allday-${tutor.key}`}
              className="flex-1 px-1.5 py-1"
              style={{ borderRight: idx < effectiveTutors.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}
            >
              {(byTutorAllDay[tutor.key] || []).slice(0, 1).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${event.extendedProps?.color || 'var(--studio-primary)'} 28%, hsl(var(--card)))`,
                    borderLeft: `3px solid ${event.extendedProps?.color || 'var(--studio-primary)'}`,
                    color: event.extendedProps?.color || 'var(--studio-primary)',
                  }}
                >
                  <span className="truncate">{event.title}</span>
                  <TypeBadge type={event.extendedProps?.eventType} />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="relative flex">
          <div className="relative w-[86px] shrink-0 border-r border-border" style={{ height: dayHeight }}>
            {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }).map((_, idx) => {
              const hour = DAY_START_HOUR + idx
              return (
                <div key={hour} className="absolute left-0 right-0" style={{ top: idx * DAY_ROW_HEIGHT }}>
                  <div className="-translate-y-1/2 px-2 text-[10px] font-medium text-muted-foreground">{formatHourLabel(hour)}</div>
                </div>
              )
            })}
          </div>

          {effectiveTutors.map((tutor, colIdx) => (
            <div
              key={`${tutor.key}-day-col`}
              className="relative flex-1 bg-muted/25 cursor-pointer"
              style={{ height: dayHeight, borderRight: colIdx < effectiveTutors.length - 1 ? '1px solid hsl(var(--border))' : 'none' }}
              onClick={handleColumnClick}
            >
              {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }).map((_, idx) => (
                <div
                  key={`${tutor.key}-line-${idx}`}
                  className="absolute left-0 right-0 border-t border-border/80"
                  style={{ top: idx * DAY_ROW_HEIGHT }}
                />
              ))}

              {(byTutorTimed[tutor.key] || []).map((event) => {
                const start = new Date(event.start)
                const end = new Date(event.end)
                const top = ((start.getHours() * 60 + start.getMinutes() - startMinutes) / 60) * DAY_ROW_HEIGHT
                const height = Math.max(24, ((end.getHours() * 60 + end.getMinutes() - (start.getHours() * 60 + start.getMinutes())) / 60) * DAY_ROW_HEIGHT - 2)
                const widthPercent = 100 / event.totalLanes
                const leftPercent = event.lane * widthPercent

                const accentColor = event.extendedProps?.color || 'var(--studio-primary)'
                const isCancelledEvent = event.extendedProps?.status === 'cancelled'
                const initials = (event.extendedProps?.tutorName || '')
                  .split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
                const dayEventType = event.extendedProps?.eventType

                return (
                  <div
                    key={event.id}
                    data-event="true"
                    onClick={(e) => { e.stopPropagation(); onEventClick?.(event.extendedProps?.raw) }}
                    className={`absolute overflow-hidden cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md rounded-lg ${isCancelledEvent ? 'opacity-50' : ''}`}
                    style={{
                      top,
                      height,
                      left: `calc(${leftPercent}% + 2px)`,
                      width: `calc(${widthPercent}% - 4px)`,
                      borderLeft: `3px solid ${accentColor}`,
                      backgroundColor: `color-mix(in srgb, ${accentColor} 28%, hsl(var(--card)))`,
                    }}
                  >
                    <div className="h-full flex flex-col px-2 py-1 overflow-hidden">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={`text-[11px] font-bold text-foreground leading-tight truncate ${isCancelledEvent ? 'line-through' : ''}`}>
                          {event.title}
                        </span>
                        <TypeBadge type={dayEventType} />
                      </div>
                      {height >= 32 && (
                        <div className="text-[9px] text-muted-foreground leading-tight truncate">
                          {formatTime(event.start)} – {formatTime(event.end)}
                        </div>
                      )}
                      {height >= 56 && event.extendedProps?.customerNames?.length > 0 && (
                        <div className="text-[9px] text-foreground/70 truncate leading-tight">
                          {event.extendedProps.customerNames.join(', ')}
                        </div>
                      )}
                      {height >= 56 && event.extendedProps?.tutorName && (
                        <div className="flex items-center gap-1 mt-auto pb-0.5">
                          <span
                            className="h-4 w-4 rounded-full text-[8px] font-bold grid place-items-center text-white shrink-0"
                            style={{ backgroundColor: accentColor }}
                          >
                            {initials.charAt(0)}
                          </span>
                          <span className="text-[9px] text-muted-foreground truncate">
                            {event.extendedProps.tutorName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {nowOffset !== null && (
            <div className="pointer-events-none absolute left-0 right-0 z-30" style={{ top: nowOffset }}>
              <div className="flex items-center">
                <div className="w-[86px] shrink-0 flex justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--studio-primary)]" />
                </div>
                <div className="h-[2px] flex-1 bg-[color:var(--studio-primary)]" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const calendarRef = useRef(null)
  const [focusDate, setFocusDate] = useState(() => new Date())
  const [viewMode, setViewMode] = useState(VIEW_MODE.WEEK)
  const [isAppointmentPanelOpen, setIsAppointmentPanelOpen] = useState(false)
  const [nowMarker, setNowMarker] = useState(() => Date.now())
  const now = useMemo(() => new Date(nowMarker), [nowMarker])

  const [events, setEvents] = useState([])
  const [instructors, setInstructors] = useState([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [slotSelection, setSlotSelection] = useState(null) // { date, time }

  const rangeStart = useMemo(() => {
    const monthStart = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1)
    return addDays(startOfWeekSunday(monthStart), -28)
  }, [focusDate])

  const rangeEnd = useMemo(() => addDays(rangeStart, 120), [rangeStart])

  const fetchCalendarEvents = useCallback(async () => {
    setIsLoadingEvents(true)
    const params = new URLSearchParams({
      start: rangeStart.toISOString(),
      end: rangeEnd.toISOString(),
      limit: 1000,
    })
    const result = await api.get(`/api/calendar?${params}`)
    if (result.success && Array.isArray(result.data)) {
      const derived = deriveInstructors(result.data)
      const colorMap = buildColorMap(derived)
      setEvents(transformAppointments(result.data, colorMap))
      if (derived.length > 0) setInstructors(derived)
    }
    setIsLoadingEvents(false)
  }, [rangeStart, rangeEnd])

  useEffect(() => {
    fetchCalendarEvents()
  }, [fetchCalendarEvents])

  const headerLabel = useMemo(() => formatHeaderLabel(focusDate, viewMode), [focusDate, viewMode])

  const dayTimedEvents = useMemo(
    () => events.filter((event) => !event.allDay && isSameDate(new Date(event.start), focusDate)),
    [events, focusDate]
  )
  const dayAllDayEvents = useMemo(
    () => events.filter((event) => event.allDay && isSameDate(new Date(event.start), focusDate)),
    [events, focusDate]
  )

  const getCalendarApi = () => calendarRef.current?.getApi()

  const syncDateFromApi = () => {
    const api = getCalendarApi()
    if (!api) return
    setFocusDate(new Date(api.getDate()))
  }

  const switchToMode = (mode, date = null) => {
    if (mode === VIEW_MODE.DAY) {
      setViewMode(VIEW_MODE.DAY)
      if (date) setFocusDate(new Date(date))
      return
    }

    const calApi = getCalendarApi()
    if (!calApi) {
      setViewMode(mode)
      if (date) setFocusDate(new Date(date))
      return
    }
    calApi.changeView(FULLCALENDAR_VIEW[mode], date ?? calApi.getDate())
    setViewMode(mode)
    setFocusDate(new Date(date ?? calApi.getDate()))
  }

  const goToToday = () => {
    if (viewMode === VIEW_MODE.DAY) {
      setFocusDate(new Date())
      return
    }

    const calApi = getCalendarApi()
    if (!calApi) return
    calApi.today()
    syncDateFromApi()
  }

  const shiftView = (direction) => {
    if (viewMode === VIEW_MODE.DAY) {
      setFocusDate((prev) => addDays(prev, direction))
      return
    }

    const calApi = getCalendarApi()
    if (!calApi) return
    if (direction < 0) calApi.prev()
    else calApi.next()
    syncDateFromApi()
  }

  useEffect(() => {
    const timer = setInterval(() => setNowMarker(Date.now()), 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (viewMode === VIEW_MODE.DAY) return
    const calApi = getCalendarApi()
    if (!calApi) return
    calApi.changeView(FULLCALENDAR_VIEW[viewMode])
  }, [viewMode])

  return (
    <MainLayout title="Calendar" subtitle="">
      <div className="w-full h-full">
        <div className="bg-background rounded-[24px_0px_24px_24px] w-full flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
          <div className="shrink-0 px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SmallRoundedButton onClick={goToToday}>Today</SmallRoundedButton>
              <div className="flex items-center gap-3">
                <IconCircleButton ariaLabel="Previous" onClick={() => shiftView(-1)}>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </IconCircleButton>
                <div className="text-[12px] font-bold text-muted-foreground">{headerLabel}</div>
                <IconCircleButton ariaLabel="Next" onClick={() => shiftView(1)}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </IconCircleButton>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isLoadingEvents && (
                <span className="text-[11px] text-muted-foreground animate-pulse">Loading…</span>
              )}
              <div className="flex items-center">
                <SegmentedButton
                  active={viewMode === VIEW_MODE.DAY}
                  className="rounded-[30px_0px_0px_30px]"
                  onClick={() => switchToMode(VIEW_MODE.DAY)}
                >
                  Day
                </SegmentedButton>
                <SegmentedButton
                  active={viewMode === VIEW_MODE.WEEK}
                  className="rounded-none border-l-0"
                  onClick={() => switchToMode(VIEW_MODE.WEEK)}
                >
                  Week
                </SegmentedButton>
                <SegmentedButton
                  active={viewMode === VIEW_MODE.MONTH}
                  className="rounded-[0px_30px_30px_0px] border-l-0"
                  onClick={() => switchToMode(VIEW_MODE.MONTH)}
                >
                  Month
                </SegmentedButton>
              </div>

              <Link
                href="/calendar/lessons"
                className="h-10 rounded-[20px] border border-border bg-background px-5 text-[12px] font-bold text-foreground hover:bg-muted transition-colors inline-flex items-center"
              >
                Lessons
              </Link>

              <button
                type="button"
                onClick={() => setIsAppointmentPanelOpen(true)}
                className="h-10 rounded-[20px] bg-brand px-5 text-[12px] font-bold text-brand-foreground hover:bg-brand-dark transition-colors"
              >
                Create Appointment
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 px-6 pt-6 pb-6">
            <div className="flex h-full gap-4 min-w-0">
              <div className="flex-1 min-w-0">
                {viewMode === VIEW_MODE.DAY ? (
                  <TutorDayCalendar
                    focusDate={focusDate}
                    now={now}
                    dayTimedEvents={dayTimedEvents}
                    dayAllDayEvents={dayAllDayEvents}
                    tutors={instructors}
                    onEventClick={(raw) => { setSelectedEvent(raw); setIsAppointmentPanelOpen(false) }}
                    onSlotClick={({ date, time }) => {
                      setSlotSelection({ date, time })
                      setSelectedEvent(null)
                      setIsAppointmentPanelOpen(true)
                    }}
                  />
                ) : (
                  <div className="h-full overflow-hidden rounded-[12px] border border-border bg-background calendar-shell">
                    <FullCalendar
                      ref={calendarRef}
                      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                      initialView={FULLCALENDAR_VIEW[viewMode]}
                      initialDate={focusDate}
                      headerToolbar={false}
                      height="100%"
                      nowIndicator
                      allDaySlot
                      slotMinTime="06:00:00"
                      slotMaxTime="22:00:00"
                      slotDuration="00:30:00"
                      expandRows
                      stickyHeaderDates
                      dayMaxEvents={false}
                      eventMaxStack={10}
                      events={events}
                      editable={false}
                      selectable
                      navLinks
                      eventOverlap
                      datesSet={(arg) => {
                        setViewMode(mapViewTypeToMode(arg.view.type))
                        setFocusDate(new Date(arg.view.calendar.getDate()))
                      }}
                      dateClick={(arg) => {
                        const clickedDate = arg.dateStr?.slice(0, 10) ?? ''
                        const clickedTime = arg.dateStr?.slice(11, 16) ?? ''
                        if (mapViewTypeToMode(arg.view.type) !== VIEW_MODE.DAY) {
                          switchToMode(VIEW_MODE.DAY, arg.date)
                        } else {
                          setSlotSelection({ date: clickedDate, time: clickedTime })
                          setSelectedEvent(null)
                          setIsAppointmentPanelOpen(true)
                        }
                      }}
                      navLinkDayClick={(date) => switchToMode(VIEW_MODE.DAY, date)}
                      eventClick={(arg) => {
                        const raw = arg.event.extendedProps?.raw
                        if (raw) { setSelectedEvent(raw); setIsAppointmentPanelOpen(false) }
                      }}
                      eventContent={renderEventContent}
                      views={{
                        dayGridMonth: { dayMaxEventRows: 3 },
                        timeGridWeek: {
                          dayHeaderFormat: { weekday: 'short', day: 'numeric' },
                        },
                      }}
                    />
                  </div>
                )}
              </div>

              {isAppointmentPanelOpen && (
                <AppointmentComposerPanel
                  onClose={() => { setIsAppointmentPanelOpen(false); setSlotSelection(null) }}
                  onCreated={fetchCalendarEvents}
                  initialDate={slotSelection?.date}
                  initialTime={slotSelection?.time}
                />
              )}
              {selectedEvent && !isAppointmentPanelOpen && (
                <EventDetailPanel
                  event={selectedEvent}
                  onClose={() => setSelectedEvent(null)}
                  onUpdated={() => { fetchCalendarEvents(); setSelectedEvent(null) }}
                  onDeleted={() => { fetchCalendarEvents(); setSelectedEvent(null) }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
