import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date, timeZone) {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  // Date-only values (dob, memberSince, enrollment/expiry/lesson/payment
  // dates, etc.) are stored as exact UTC midnight — the backend's parseDate()
  // constructs them as a local calendar date and, since imports commonly run
  // with a UTC server clock, that lands on UTC midnight on the wire. If we
  // then format in the *browser's* local timezone (the default below), a
  // browser west of UTC rolls that back to the previous day — the exact
  // "dates land a day early" bug. Real timestamps (createdAt, etc.) are for
  // all practical purposes never exactly UTC midnight, so this heuristic
  // formats date-only values in UTC (no shift) while leaving genuine
  // timestamp formatting untouched.
  const looksDateOnly =
    d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(timeZone ? { timeZone } : looksDateOnly ? { timeZone: 'UTC' } : {}),
  })
}

export function formatDateTime(date, timeZone) {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  })
}

/** Local calendar YYYY-MM-DD (not UTC) — for report date presets/filters. */
export function toLocalCalendarDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Calendar YYYY-MM-DD in an IANA timezone. */
export function toCalendarDateStringInTimeZone(date = new Date(), timeZone) {
  if (!timeZone) return toLocalCalendarDateString(date)
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatPercentage(value) {
  return `${value.toFixed(1)}%`
}

export function getContactDisplayName(contact) {
  if (!contact) return 'Unknown'
  return contact.name || contact.phoneNumber || contact.email || 'Unknown'
}

export function getInitials(name) {
  if (!name) return '??'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncateText(text, length = 50) {
  if (!text) return ''
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}


