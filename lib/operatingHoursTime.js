/**
 * Operating hours are stored as decimal hours (8.5 = 8:30, 24 = midnight close).
 * These helpers convert to/from whole minutes so any minute (not just :00/:30) round-trips.
 */

const MINUTES_PER_DAY = 24 * 60

/** Decimal hours → whole minutes since midnight (float noise like 607.0000000000001 → 607). */
export function decimalToMinutes(hourValue) {
  return Math.round(Number(hourValue) * 60)
}

/** Whole minutes → decimal hours. */
export function minutesToDecimal(minutes) {
  return minutes / 60
}

/** Snap a stored decimal-hour value to a whole minute; fallback if not a number. */
export function snapToMinute(n, fallback) {
  const v = Number(n)
  if (!Number.isFinite(v)) return fallback
  return minutesToDecimal(Math.round(v * 60))
}

/** Decimal hours → "10:30 AM". Close at 24 shows as 12:00 AM. */
export function formatClock(hourValue) {
  const total = decimalToMinutes(hourValue) % MINUTES_PER_DAY
  const h24 = Math.floor(total / 60)
  const minute = total % 60
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`
}

const CLOCK_RE = /^(\d{1,2})(?::?([0-5]\d))?(am|pm|a|p)?$/

/**
 * Parse typed text into decimal hours, or null if it isn't a usable time.
 * Accepts "10:30 AM", "10:30am", "1030", "930p", "9", "21:15", "noon", "midnight".
 * Without am/pm, 1–12 keeps `defaultPeriod` (so typing "9:15" in a PM field stays PM);
 * 13–23 and 0 are read as 24-hour.
 *
 * role "open":  00:00 – 23:59 (midnight = 0).
 * role "close": 00:01 – 24:00 (midnight = 24).
 */
export function parseClockInput(text, role, defaultPeriod = 'AM') {
  const raw = String(text ?? '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, '')
  if (!raw) return null

  let minutes
  if (raw === 'noon') {
    minutes = 12 * 60
  } else if (raw === 'midnight') {
    minutes = 0
  } else {
    const m = CLOCK_RE.exec(raw)
    if (!m) return null
    const hour = Number(m[1])
    const minute = m[2] ? Number(m[2]) : 0
    const suffix = m[3] ? (m[3][0] === 'p' ? 'PM' : 'AM') : null

    if (suffix) {
      if (hour < 1 || hour > 12) return null
      minutes = ((hour % 12) + (suffix === 'PM' ? 12 : 0)) * 60 + minute
    } else if (hour === 24 && minute === 0) {
      minutes = MINUTES_PER_DAY
    } else if (hour >= 13 || hour === 0) {
      if (hour > 23) return null
      minutes = hour * 60 + minute
    } else {
      minutes = ((hour % 12) + (defaultPeriod === 'PM' ? 12 : 0)) * 60 + minute
    }
  }

  if (role === 'close') {
    if (minutes === 0) minutes = MINUTES_PER_DAY
    if (minutes < 1 || minutes > MINUTES_PER_DAY) return null
  } else if (minutes < 0 || minutes >= MINUTES_PER_DAY) {
    return null
  }
  return minutesToDecimal(minutes)
}
