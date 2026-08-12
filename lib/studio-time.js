'use client'

import { fromZonedTime, toZonedTime } from 'date-fns-tz'

/**
 * Converts a wall-clock date+time typed by the user into the correct UTC
 * instant for the STUDIO's timezone — not the browser's.
 *
 * Bug this fixes: `new Date("2026-08-05T10:00").toISOString()` parses the
 * string as browser-local time. A US-based admin typing "10am" for an India
 * studio would create the event at 10am US time (converted to UTC), landing
 * on the calendar at ~7:30pm India time instead of 10am India time.
 *
 * @param {string} dateStr  'YYYY-MM-DD'
 * @param {string} timeStr  'HH:mm'
 * @param {string} timezone IANA zone, e.g. 'Asia/Kolkata'. Falls back to the
 *                          browser's own zone if not provided (old behavior),
 *                          so callers that haven't wired a studio timezone
 *                          through yet don't crash.
 * @returns {string|undefined} ISO UTC string, or undefined if inputs are incomplete.
 */
export function studioWallTimeToUtcISO(dateStr, timeStr, timezone) {
  if (!dateStr || !timeStr) return undefined
  const naive = `${dateStr}T${timeStr}`
  if (!timezone) return new Date(naive).toISOString() // no studio tz known yet — old behavior
  return fromZonedTime(naive, timezone).toISOString()
}

/**
 * The reverse of studioWallTimeToUtcISO — pulls a wall-clock {date, time}
 * pair out of a stored UTC instant, in the STUDIO's timezone, not the
 * browser's. This is what an edit form must use to seed its Date/Time
 * inputs: seeding them with `new Date(iso).getHours()`/`.toISOString()`
 * (browser-local/UTC) while the read-only view displays studio-local time,
 * and while saving re-encodes via studioWallTimeToUtcISO with the studio
 * timezone, means the edit form can show a *different* time than what's
 * actually on the calendar whenever the browser's timezone differs from the
 * studio's — confusing at best, and silently saves a shifted time if the
 * user "corrects" a field that only looked wrong.
 *
 * @param {string} iso ISO UTC instant (e.g. event.startDateTime)
 * @param {string} timezone IANA zone, e.g. 'America/Chicago'. Falls back to
 *                          the browser's own zone if not provided, same
 *                          fallback rule as studioWallTimeToUtcISO.
 * @returns {{date: string, time: string}} date as 'YYYY-MM-DD', time as 'HH:mm'
 */
export function utcToStudioWallTime(iso, timezone) {
  if (!iso) return { date: '', time: '' }
  const zoned = timezone ? toZonedTime(iso, timezone) : new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}-${pad(zoned.getDate())}`
  const time = `${pad(zoned.getHours())}:${pad(zoned.getMinutes())}`
  return { date, time }
}
