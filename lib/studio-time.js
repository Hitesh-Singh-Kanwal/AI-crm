'use client'

import { fromZonedTime } from 'date-fns-tz'

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
