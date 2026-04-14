'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import MainLayout from '@/components/layout/MainLayout'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import AppointmentComposerPanel from './components/AppointmentComposerPanel'

const COLORS = {
  border: '#F5F6F7',
  shadow: '0px 2px 5px 0px rgba(38, 51, 77, 0.03)',
}

const TUTORS = [
  { key: 't-1', initials: 'RG', name: 'Rachel Green', color: '#29CC39' },
  { key: 't-2', initials: 'AS', name: 'Ariana Shah', color: '#FFCB33' },
  { key: 't-3', initials: 'VK', name: 'Vikram Khanna', color: '#CD3358' },
  { key: 't-4', initials: 'NP', name: 'Neha Patel', color: '#4CC9F0' },
  { key: 't-5', initials: 'SM', name: 'Sana Malik', color: '#CE32E0' },
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

const CLASS_TITLES = [
  'Ballet Basics',
  'Hip Hop Juniors',
  'Yoga Flow',
  'Contemporary Lab',
  'Piano Beginner',
  'Guitar Practice',
  'Math Support',
]

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function setTime(date, hours, minutes = 0) {
  const next = new Date(date)
  next.setHours(hours, minutes, 0, 0)
  return next
}

function mapViewTypeToMode(viewType) {
  if (viewType === 'timeGridDay') return VIEW_MODE.DAY
  if (viewType === 'timeGridWeek') return VIEW_MODE.WEEK
  return VIEW_MODE.MONTH
}

function getDateSeed(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

function dateKey(date) {
  return date.toISOString().slice(0, 10)
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

function buildMockEvents(rangeStart, rangeEnd) {
  const items = []
  let cursor = new Date(rangeStart)
  cursor.setHours(0, 0, 0, 0)

  while (cursor <= rangeEnd) {
    const seed = getDateSeed(cursor)
    const dailyCount = 10 + (seed % 8) // 10..17/day to stress test

    for (let i = 0; i < dailyCount; i++) {
      const tutor = TUTORS[(seed + i) % TUTORS.length]
      const startHour = 6 + ((seed + i * 3) % 15) // 6..20
      const startMinute = [0, 15, 30, 45][(seed + i) % 4]
      const durationMin = [30, 45, 60, 75, 90, 120][(seed + i * 2) % 6]
      const start = setTime(cursor, startHour, startMinute)
      const end = new Date(start.getTime() + durationMin * 60000)
      if (end.getHours() > 22) continue

      items.push({
        id: `${dateKey(cursor)}-${i}`,
        title: CLASS_TITLES[(seed + i * 3) % CLASS_TITLES.length],
        tutorKey: tutor.key,
        tutorName: tutor.name,
        start,
        end,
        allDay: false,
      })
    }

    // Exact overlap, different instructors.
    TUTORS.slice(0, 4).forEach((tutor, idx) => {
      items.push({
        id: `${dateKey(cursor)}-hard-overlap-${idx}`,
        title: `Peak Slot ${idx + 1}`,
        tutorKey: tutor.key,
        tutorName: tutor.name,
        start: setTime(cursor, 13, 0),
        end: setTime(cursor, 14, 0),
        allDay: false,
      })
    })

    // Partial overlap chain.
    TUTORS.slice(1, 4).forEach((tutor, idx) => {
      const start = setTime(cursor, 13, 15 + idx * 15)
      const end = new Date(start.getTime() + 45 * 60000)
      items.push({
        id: `${dateKey(cursor)}-stagger-${idx}`,
        title: `Staggered Session ${idx + 1}`,
        tutorKey: tutor.key,
        tutorName: tutor.name,
        start,
        end,
        allDay: false,
      })
    })

    // Back-to-back for one instructor.
    const backToBackTutor = TUTORS[seed % TUTORS.length]
    for (let j = 0; j < 3; j++) {
      items.push({
        id: `${dateKey(cursor)}-b2b-${j}`,
        title: `Back to Back ${j + 1}`,
        tutorKey: backToBackTutor.key,
        tutorName: backToBackTutor.name,
        start: setTime(cursor, 15 + j, 0),
        end: setTime(cursor, 15 + j, 45),
        allDay: false,
      })
    }

    // Short and long session edges.
    items.push({
      id: `${dateKey(cursor)}-short`,
      title: 'Quick Assessment',
      tutorKey: TUTORS[(seed + 2) % TUTORS.length].key,
      tutorName: TUTORS[(seed + 2) % TUTORS.length].name,
      start: setTime(cursor, 9, 45),
      end: setTime(cursor, 10, 0),
      allDay: false,
    })
    items.push({
      id: `${dateKey(cursor)}-long`,
      title: 'Workshop Block',
      tutorKey: TUTORS[(seed + 3) % TUTORS.length].key,
      tutorName: TUTORS[(seed + 3) % TUTORS.length].name,
      start: setTime(cursor, 16, 0),
      end: setTime(cursor, 19, 0),
      allDay: false,
    })

    // Frequent all-day events.
    if (seed % 2 === 0) {
      items.push({
        id: `${dateKey(cursor)}-all-1`,
        title: 'Holiday Batch',
        tutorKey: TUTORS[seed % TUTORS.length].key,
        tutorName: TUTORS[seed % TUTORS.length].name,
        start: setTime(cursor, 0, 0),
        end: setTime(cursor, 23, 59),
        allDay: true,
      })
    }
    if (seed % 3 === 0) {
      items.push({
        id: `${dateKey(cursor)}-all-2`,
        title: 'Special Camp',
        tutorKey: TUTORS[(seed + 1) % TUTORS.length].key,
        tutorName: TUTORS[(seed + 1) % TUTORS.length].name,
        start: setTime(cursor, 0, 0),
        end: setTime(cursor, 23, 59),
        allDay: true,
      })
    }

    cursor = addDays(cursor, 1)
  }

  return items
}

function SegmentedButton({ active, children, className, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-10 px-4 text-[12px] leading-none select-none bg-white border border-[#F5F6F7]',
        active ? 'font-bold text-[#64748B]' : 'font-medium text-[#94A3B8]',
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
      className="h-10 w-10 rounded-full bg-white border border-[#F5F6F7] grid place-items-center"
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
      className="h-10 rounded-[20px] px-4 bg-white border border-[#F5F6F7] text-[12px] font-bold text-[#94A3B8]"
      style={{ boxShadow: COLORS.shadow }}
    >
      {children}
    </button>
  )
}

function renderEventContent(info) {
  return (
    <div className="text-[10px] leading-tight">
      <div className="truncate font-semibold">{info.event.title}</div>
      <div className="truncate opacity-90">{info.event.extendedProps?.tutorName}</div>
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

function TutorDayCalendar({ focusDate, now, dayTimedEvents, dayAllDayEvents }) {
  const dayHeight = (DAY_END_HOUR - DAY_START_HOUR) * DAY_ROW_HEIGHT

  const byTutorTimed = useMemo(() => {
    const map = {}
    TUTORS.forEach((tutor) => {
      const filtered = dayTimedEvents.filter((event) => event.extendedProps?.tutorKey === tutor.key)
      map[tutor.key] = layoutOverlappingEvents(filtered)
    })
    return map
  }, [dayTimedEvents])

  const byTutorAllDay = useMemo(() => {
    const map = {}
    TUTORS.forEach((tutor) => {
      map[tutor.key] = dayAllDayEvents.filter((event) => event.extendedProps?.tutorKey === tutor.key)
    })
    return map
  }, [dayAllDayEvents])

  const isToday = isSameDate(focusDate, now)
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = DAY_START_HOUR * 60
  const endMinutes = DAY_END_HOUR * 60
  const nowOffset = isToday && nowMinutes >= startMinutes && nowMinutes <= endMinutes
    ? ((nowMinutes - startMinutes) / 60) * DAY_ROW_HEIGHT
    : null

  return (
    <div className="h-full overflow-auto rounded-[12px] border border-[#F5F6F7] bg-white">
      <div style={{ minWidth: DAY_LEFT_RAIL_WIDTH + TUTORS.length * 180 }}>
        <div className="sticky top-0 z-20 flex h-16 border-b border-[#F1F5F9] bg-white">
          <div className="w-[86px] shrink-0 border-r border-[#F1F5F9] px-2 py-2 text-[10px] font-medium text-[#94A3B8]">
            Teachers
          </div>
          {TUTORS.map((tutor, idx) => (
            <div
              key={tutor.key}
              className="flex-1 px-2 py-2"
              style={{ borderRight: idx < TUTORS.length - 1 ? '1px solid #F1F5F9' : 'none' }}
            >
              <div className="flex items-center justify-center gap-2">
                <span
                  className="inline-grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-white"
                  style={{ backgroundColor: tutor.color }}
                >
                  {tutor.initials}
                </span>
                <span className="truncate text-[11px] font-semibold text-[#0F172A]">{tutor.name}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex h-10 border-b border-[#F1F5F9] bg-[#FEFCE8]">
          <div className="w-[86px] shrink-0 border-r border-[#F1F5F9] px-2 py-2 text-[10px] font-medium text-[#94A3B8]">All day</div>
          {TUTORS.map((tutor, idx) => (
            <div
              key={`allday-${tutor.key}`}
              className="flex-1 px-1.5 py-1"
              style={{ borderRight: idx < TUTORS.length - 1 ? '1px solid #F1F5F9' : 'none' }}
            >
              {byTutorAllDay[tutor.key].slice(0, 1).map((event) => (
                <div key={event.id} className="truncate rounded bg-[#16A34A] px-2 py-0.5 text-[10px] text-white">
                  {event.title}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="relative flex">
          <div className="relative w-[86px] shrink-0 border-r border-[#F1F5F9]" style={{ height: dayHeight }}>
            {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }).map((_, idx) => {
              const hour = DAY_START_HOUR + idx
              return (
                <div key={hour} className="absolute left-0 right-0" style={{ top: idx * DAY_ROW_HEIGHT }}>
                  <div className="-translate-y-1/2 px-2 text-[10px] font-medium text-[#94A3B8]">{formatHourLabel(hour)}</div>
                </div>
              )
            })}
          </div>

          {TUTORS.map((tutor, colIdx) => (
            <div
              key={`${tutor.key}-day-col`}
              className="relative flex-1 bg-[#FEFCE8]"
              style={{ height: dayHeight, borderRight: colIdx < TUTORS.length - 1 ? '1px solid #F1F5F9' : 'none' }}
            >
              {Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }).map((_, idx) => (
                <div
                  key={`${tutor.key}-line-${idx}`}
                  className="absolute left-0 right-0 border-t border-[#F3F4F6]"
                  style={{ top: idx * DAY_ROW_HEIGHT }}
                />
              ))}

              {byTutorTimed[tutor.key].map((event) => {
                const start = new Date(event.start)
                const end = new Date(event.end)
                const top = ((start.getHours() * 60 + start.getMinutes() - startMinutes) / 60) * DAY_ROW_HEIGHT
                const height = Math.max(24, ((end.getHours() * 60 + end.getMinutes() - (start.getHours() * 60 + start.getMinutes())) / 60) * DAY_ROW_HEIGHT - 2)
                const widthPercent = 100 / event.totalLanes
                const leftPercent = event.lane * widthPercent

                return (
                  <div
                    key={event.id}
                    className="absolute rounded-md border p-1.5"
                    style={{
                      top,
                      height,
                      left: `calc(${leftPercent}% + 2px)`,
                      width: `calc(${widthPercent}% - 4px)`,
                      backgroundColor: event.backgroundColor,
                      borderColor: event.borderColor,
                    }}
                  >
                    <div className="truncate text-[10px] font-semibold text-[#0F172A]">
                      {formatTime(event.start)} - {formatTime(event.end)}
                    </div>
                    <div className="truncate text-[10px] text-[#334155]">{event.title}</div>
                    <div className="truncate text-[9px] text-[#475569]">{event.extendedProps?.tutorName}</div>
                  </div>
                )
              })}
            </div>
          ))}

          {nowOffset !== null && (
            <div className="pointer-events-none absolute left-0 right-0 z-30" style={{ top: nowOffset }}>
              <div className="flex items-center">
                <div className="w-[86px] shrink-0 flex justify-center">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#16A34A]" />
                </div>
                <div className="h-[2px] flex-1 bg-[#16A34A]" />
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

  const rangeStart = useMemo(() => {
    const monthStart = new Date(focusDate.getFullYear(), focusDate.getMonth(), 1)
    return addDays(startOfWeekSunday(monthStart), -28)
  }, [focusDate])

  const rangeEnd = useMemo(() => addDays(rangeStart, 120), [rangeStart])

  const events = useMemo(() => {
    const tutorByKey = Object.fromEntries(TUTORS.map((t) => [t.key, t]))
    return buildMockEvents(rangeStart, rangeEnd).map((event) => {
      const tutor = tutorByKey[event.tutorKey]
      return {
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        backgroundColor: event.allDay ? '#16A34A' : `${tutor.color}22`,
        borderColor: event.allDay ? '#16A34A' : tutor.color,
        textColor: event.allDay ? '#FFFFFF' : '#0F172A',
        extendedProps: {
          tutorName: event.tutorName,
          tutorKey: event.tutorKey,
        },
      }
    })
  }, [rangeEnd, rangeStart])

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

    const api = getCalendarApi()
    if (!api) {
      setViewMode(mode)
      if (date) setFocusDate(new Date(date))
      return
    }
    api.changeView(FULLCALENDAR_VIEW[mode], date ?? api.getDate())
    setViewMode(mode)
    setFocusDate(new Date(date ?? api.getDate()))
  }

  const goToToday = () => {
    if (viewMode === VIEW_MODE.DAY) {
      setFocusDate(new Date())
      return
    }

    const api = getCalendarApi()
    if (!api) return
    api.today()
    syncDateFromApi()
  }

  const shiftView = (direction) => {
    if (viewMode === VIEW_MODE.DAY) {
      setFocusDate((prev) => addDays(prev, direction))
      return
    }

    const api = getCalendarApi()
    if (!api) return
    if (direction < 0) api.prev()
    else api.next()
    syncDateFromApi()
  }

  useEffect(() => {
    const timer = setInterval(() => setNowMarker(Date.now()), 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (viewMode === VIEW_MODE.DAY) return
    const api = getCalendarApi()
    if (!api) return
    api.changeView(FULLCALENDAR_VIEW[viewMode])
  }, [viewMode])

  return (
    <MainLayout title="Calendar" subtitle="">
      <div className="w-full h-full">
        <div className="bg-white rounded-[24px_0px_24px_24px] w-full flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
          <div className="shrink-0 px-6 pt-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <SmallRoundedButton onClick={goToToday}>Today</SmallRoundedButton>
              <div className="flex items-center gap-3">
                <IconCircleButton ariaLabel="Previous" onClick={() => shiftView(-1)}>
                  <ChevronLeft className="h-4 w-4 text-[#94A3B8]" />
                </IconCircleButton>
                <div className="text-[12px] font-bold text-[#94A3B8]">{headerLabel}</div>
                <IconCircleButton ariaLabel="Next" onClick={() => shiftView(1)}>
                  <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
                </IconCircleButton>
              </div>
            </div>

            <div className="flex items-center gap-3">
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

              <button
                type="button"
                onClick={() => setIsAppointmentPanelOpen(true)}
                className="h-10 rounded-[20px] bg-[#D61F8C] px-5 text-[12px] font-bold text-white hover:bg-[#C2187E]"
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
                  />
                ) : (
                  <div className="h-full overflow-hidden rounded-[12px] border border-[#F5F6F7] bg-white calendar-shell">
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
                      dayMaxEvents={3}
                      moreLinkClick="popover"
                      eventMaxStack={3}
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
                        if (mapViewTypeToMode(arg.view.type) !== VIEW_MODE.DAY) {
                          switchToMode(VIEW_MODE.DAY, arg.date)
                        }
                      }}
                      navLinkDayClick={(date) => switchToMode(VIEW_MODE.DAY, date)}
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
                <AppointmentComposerPanel onClose={() => setIsAppointmentPanelOpen(false)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
