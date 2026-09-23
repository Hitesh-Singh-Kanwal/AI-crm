'use client'

import { useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import { toStudioLocalDate } from '@/lib/studioLocalDate'
import { studioWallTimeToUtcISO } from '@/lib/studio-time'
import SearchableSelect from '@/components/ui/searchable-select'

/**
 * Shared teacher + date + free-slot grid for calendar booking and Sell Intro.
 * Mirrors AppointmentComposerPanel's AvailabilityPicker (no recurrence).
 */

function formatTime12h(time24) {
  const [h, m] = String(time24 || '00:00').split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`
}

function localCalendarDayQueryRange(dateStr, tz) {
  const [y, mo, d] = String(dateStr || '').split('-').map(Number)
  if (!y || !mo || !d) return null
  const dayStart = new Date(y, mo - 1, d, 0, 0, 0, 0)
  const dayEndExclusive = dayStart.getTime() + 86400000
  const startISO =
    studioWallTimeToUtcISO(dateStr, '00:00', tz) || dayStart.toISOString()
  const endISO =
    studioWallTimeToUtcISO(dateStr, '23:59', tz) ||
    new Date(y, mo - 1, d, 23, 59, 59, 999).toISOString()
  return {
    startISO,
    endISO,
    dayStartMs: dayStart.getTime(),
    dayEndExclusiveMs: dayEndExclusive,
  }
}

function clipIntervalToLocalDay(evStart, evEnd, dayStartMs, dayEndExclusiveMs) {
  const s = Math.max(evStart.getTime(), dayStartMs)
  const e = Math.min(evEnd.getTime(), dayEndExclusiveMs)
  if (e <= s) return null
  return {
    start: Math.max(0, Math.floor((s - dayStartMs) / 60000)),
    end: Math.min(24 * 60, Math.ceil((e - dayStartMs) / 60000)),
  }
}

function statusBlocksAvailability(status) {
  if (status === 'cancelled_no_charge' || status === 'cancelled_charged') return false
  return true
}

function mergeMinuteIntervals(intervals) {
  if (!intervals.length) return []
  const sorted = [...intervals].sort((a, b) => a.start - b.start)
  const out = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const prev = out[out.length - 1]
    const cur = sorted[i]
    if (cur.start < prev.end) prev.end = Math.max(prev.end, cur.end)
    else out.push({ ...cur })
  }
  return out
}

function enumerateAvailabilitySlotStarts(
  slotAlignMins,
  slotStepMins,
  dayEndMin,
  busyIntervals = [],
  bookingDurMins,
) {
  const step = Math.max(15, Number(slotStepMins) || 30)
  const bookingDur = Math.max(
    15,
    Number(bookingDurMins) > 0 ? Number(bookingDurMins) : step,
  )
  const windowStart = Math.max(0, Number(slotAlignMins) || 0)
  const windowEnd = Math.min(24 * 60, Number(dayEndMin) || 21 * 60)
  const busy = [...busyIntervals].sort((a, b) => a.start - b.start)

  let t = windowStart
  const starts = []

  while (t + bookingDur <= windowEnd) {
    const slotEnd = t + bookingDur
    const conflict = busy.find((b) => t < b.end && slotEnd > b.start)
    if (conflict) {
      if (conflict.end > t) {
        t = conflict.end
        continue
      }
    }
    starts.push(t)
    t += step
  }

  return starts
}

function AvailabilityGrid({
  teacherID,
  date,
  durationMins,
  slotStepMins,
  slotAlignMins,
  dayEndMin,
  selectedStart,
  onSelect,
  studioTz,
}) {
  const [busyIntervalsMin, setBusyIntervalsMin] = useState([])
  const [blockingEventCount, setBlockingEventCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const range = localCalendarDayQueryRange(date, studioTz)
    if (!teacherID || !range) {
      setBusyIntervalsMin([])
      setBlockingEventCount(0)
      return
    }
    let cancelled = false
    setLoading(true)
    const qs = new URLSearchParams({
      teacherID: String(teacherID),
      start: new Date(new Date(range.startISO).getTime() - 86400000).toISOString(),
      end: range.endISO,
      limit: '500',
    })
    api
      .get(`/api/calendar?${qs.toString()}`)
      .then((res) => {
        if (cancelled) return
        if (!res.success || !Array.isArray(res.data)) {
          setBusyIntervalsMin([])
          setBlockingEventCount(0)
          return
        }
        const intervals = []
        let blocking = 0
        for (const ev of res.data) {
          if (!statusBlocksAvailability(ev.status)) continue
          const st = ev.startDateTime ? new Date(ev.startDateTime) : null
          const en = ev.endDateTime ? new Date(ev.endDateTime) : null
          if (!st || !en || !(en > st)) continue
          const clipped = clipIntervalToLocalDay(
            toStudioLocalDate(st, studioTz),
            toStudioLocalDate(en, studioTz),
            range.dayStartMs,
            range.dayEndExclusiveMs,
          )
          if (clipped && clipped.end > clipped.start) {
            intervals.push(clipped)
            blocking += 1
          }
        }
        setBlockingEventCount(blocking)
        setBusyIntervalsMin(mergeMinuteIntervals(intervals))
      })
      .catch(() => {
        if (!cancelled) {
          setBusyIntervalsMin([])
          setBlockingEventCount(0)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [teacherID, date, studioTz])

  const availableSlots = useMemo(() => {
    const bookingDur = Math.max(15, Number(durationMins) || 50)
    const stepMins = Math.max(
      15,
      Number(slotStepMins) > 0 ? Number(slotStepMins) : bookingDur,
    )
    const windowEnd = Number(dayEndMin) > 0 ? Number(dayEndMin) : 21 * 60
    const gridStarts = enumerateAvailabilitySlotStarts(
      slotAlignMins,
      stepMins,
      windowEnd,
      busyIntervalsMin,
      bookingDur,
    )
    return gridStarts.map((t) => {
      const slotEnd = t + bookingDur
      const hh = String(Math.floor(t / 60)).padStart(2, '0')
      const mm = String(t % 60).padStart(2, '0')
      const eh = String(Math.floor(slotEnd / 60)).padStart(2, '0')
      const em = String(slotEnd % 60).padStart(2, '0')
      return { start: `${hh}:${mm}`, end: `${eh}:${em}` }
    })
  }, [busyIntervalsMin, durationMins, slotStepMins, slotAlignMins, dayEndMin])

  if (!teacherID || !date) return null

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Availability · every {slotStepMins || durationMins || 50} min
        </span>
        {!loading && (
          <span className="text-[10px] text-muted-foreground">
            {availableSlots.length} free · {blockingEventCount} booked
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-[11px] text-muted-foreground py-1">Checking teacher&apos;s schedule…</p>
      ) : availableSlots.length === 0 ? (
        <p className="text-[11px] text-destructive font-medium py-0.5">
          No available slots on this date.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1">
          {availableSlots.map((slot) => {
            const isSelected = selectedStart === slot.start
            return (
              <button
                key={slot.start}
                type="button"
                onClick={() => onSelect?.(slot)}
                className={[
                  'px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors shrink-0',
                  isSelected
                    ? 'border-brand bg-brand text-brand-foreground'
                    : 'border-border bg-background text-foreground hover:bg-muted/50 hover:border-brand/40',
                ].join(' ')}
              >
                {formatTime12h(slot.start)}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

/**
 * @param {object} props
 * @param {Array<{value:string,label:string}>} props.teacherOptions
 * @param {string} props.teacherID
 * @param {(id:string)=>void} props.onTeacherChange
 * @param {string} props.date YYYY-MM-DD
 * @param {(date:string)=>void} props.onDateChange
 * @param {{start:string,end:string}|null} props.selectedSlot wall-clock HH:mm
 * @param {(slot:{start:string,end:string}|null)=>void} props.onSlotChange
 * @param {number} [props.durationMins=50]
 * @param {number} [props.slotStepMins]
 * @param {number} [props.slotAlignMins=360] minutes from midnight (default 6am)
 * @param {number} [props.dayEndMin=1260] minutes from midnight (default 9pm)
 * @param {string|null} [props.studioTz]
 */
export default function LessonSlotPicker({
  teacherOptions = [],
  teacherID,
  onTeacherChange,
  date,
  onDateChange,
  selectedSlot,
  onSlotChange,
  durationMins = 50,
  slotStepMins,
  slotAlignMins = 6 * 60,
  dayEndMin = 21 * 60,
  studioTz = null,
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-1">Teacher</p>
        <SearchableSelect
          value={teacherID || ''}
          onChange={(v) => {
            onTeacherChange?.(v)
            onSlotChange?.(null)
          }}
          options={teacherOptions}
          placeholder="Select teacher…"
        />
      </div>

      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-1">Date</p>
        <input
          type="date"
          value={date || ''}
          onChange={(e) => {
            onDateChange?.(e.target.value)
            onSlotChange?.(null)
          }}
          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[12px] text-foreground outline-none focus:border-primary transition-colors"
        />
      </div>

      <AvailabilityGrid
        teacherID={teacherID}
        date={date}
        durationMins={durationMins}
        slotStepMins={slotStepMins || durationMins}
        slotAlignMins={slotAlignMins}
        dayEndMin={dayEndMin}
        selectedStart={selectedSlot?.start || null}
        onSelect={(slot) => onSlotChange?.(slot)}
        studioTz={studioTz}
      />
    </div>
  )
}

/** Build UTC ISO start/end from wall-clock slot + studio tz. */
export function slotWallTimesToUtcRange(date, slot, studioTz) {
  if (!date || !slot?.start || !slot?.end) return null
  const startDateTime = studioWallTimeToUtcISO(date, slot.start, studioTz)
  const endDateTime = studioWallTimeToUtcISO(date, slot.end, studioTz)
  if (!startDateTime || !endDateTime) return null
  return { startDateTime, endDateTime }
}
