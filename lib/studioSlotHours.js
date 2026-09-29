/** Same fallback the calling/texting agent uses when a location has no operatingHours. */
const FALLBACK_STUDIO_HOURS = [
  null, // Sunday — closed
  { open: 9, close: 20 },
  { open: 9, close: 20 },
  { open: 9, close: 20 },
  { open: 9, close: 20 },
  { open: 9, close: 20 },
  { open: 9, close: 17 }, // Saturday
]

const WEEKDAY_TO_DOW = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

/**
 * When the location has operatingHours saved, only those days are open —
 * missing days are closed. Fallback hours apply only when operatingHours is empty.
 */
export function buildDayMap(operatingHours) {
  if (!Array.isArray(operatingHours) || operatingHours.length === 0) {
    return FALLBACK_STUDIO_HOURS.map((h) => (h ? { open: h.open, close: h.close } : null))
  }
  const map = [null, null, null, null, null, null, null]
  for (const h of operatingHours) {
    const day = Number(h?.day)
    if (day >= 0 && day <= 6) {
      map[day] = h.closed ? null : { open: Number(h.open ?? 9), close: Number(h.close ?? 20) }
    }
  }
  return map
}

export function localDayOfWeek(dateStr, tz) {
  const [year, month, day] = String(dateStr || '')
    .split('-')
    .map(Number)
  if (!year || !month || !day) return -1
  const noonUtc = new Date(Date.UTC(year, month - 1, day, 12))
  if (tz) {
    try {
      const weekdayName = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        weekday: 'long',
      }).format(noonUtc)
      return WEEKDAY_TO_DOW[weekdayName] ?? -1
    } catch {
      // fall through
    }
  }
  return noonUtc.getUTCDay()
}

/** Default Lesson Length. Schema and the agent both fall back to 60. */
export function resolveLessonMinutes(value) {
  const mins = Number(value)
  if (Number.isFinite(mins) && mins >= 15 && mins <= 180) return mins
  return 60
}

/** Resolve open/close minutes for a YYYY-MM-DD date. Half hours (8.5) → 510 mins. */
export function resolveStudioDayHours(operatingHours, dateStr, tz) {
  if (!dateStr) {
    return { closed: false, openMin: null, closeMin: null }
  }
  const dayMap = buildDayMap(operatingHours)
  const dow = localDayOfWeek(dateStr, tz)
  const hours = dow >= 0 ? dayMap[dow] : null
  if (!hours) return { closed: true, openMin: 0, closeMin: 0 }
  const openMin = Math.round(Number(hours.open) * 60)
  const closeMin = Math.round(Number(hours.close) * 60)
  if (!Number.isFinite(openMin) || !Number.isFinite(closeMin) || openMin >= closeMin) {
    return { closed: true, openMin: 0, closeMin: 0 }
  }
  return { closed: false, openMin, closeMin }
}

/**
 * Lesson starts stay on the open-time grid (open, open+step, …).
 * A busy block skips that start; it does not shift the following starts.
 */
export function enumerateGridSlotStarts(
  slotAlignMins,
  slotStepMins,
  dayEndMin,
  busyIntervals = [],
  bookingDurMins,
) {
  const step = Math.max(15, Number(slotStepMins) || 60)
  const bookingDur = Math.max(
    15,
    Number(bookingDurMins) > 0 ? Number(bookingDurMins) : step,
  )
  const windowStart = Math.max(0, Number(slotAlignMins) || 0)
  const windowEnd = Math.min(24 * 60, Number(dayEndMin) > 0 ? Number(dayEndMin) : 0)
  if (!(windowEnd > windowStart)) return []
  const busy = Array.isArray(busyIntervals) ? busyIntervals : []

  const starts = []
  for (let t = windowStart; t + bookingDur <= windowEnd; t += step) {
    const slotEnd = t + bookingDur
    const conflict = busy.some((b) => t < b.end && slotEnd > b.start)
    if (!conflict) starts.push(t)
  }
  return starts
}
