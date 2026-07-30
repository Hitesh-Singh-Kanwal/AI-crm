import { formatDate, formatDateTime } from '@/lib/utils'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/
const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

function looksLikeDateValue(value) {
  if (value instanceof Date) return !Number.isNaN(value.getTime())
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed || trimmed === '—') return false
  if (!ISO_DATE_RE.test(trimmed)) return false
  const parsed = new Date(trimmed)
  return !Number.isNaN(parsed.getTime())
}

function formatDateOnlyString(value) {
  const [y, m, d] = value.split('-').map(Number)
  // Local calendar construction — do not parse as UTC midnight.
  return formatDate(new Date(y, m - 1, d))
}

/**
 * Format a report table / drill / export cell for display.
 * Auto-formats ISO timestamps and Date objects; honors column.format when present.
 * Use column.dateStyle = 'datetime' to include time.
 * Pass timeZone (IANA) so datetimes render in the studio's timezone.
 * Plain YYYY-MM-DD strings are treated as calendar dates (no UTC shift).
 */
export function formatReportCellValue(value, column = {}, timeZone) {
  if (column.format) {
    try {
      return column.format(value)
    } catch {
      // fall through to default formatting
    }
  }

  if (value === null || value === undefined || value === '') return '—'

  const tz = timeZone || column.timeZone

  if (typeof value === 'string' && DATE_ONLY_RE.test(value.trim())) {
    return formatDateOnlyString(value.trim()) || '—'
  }

  if (looksLikeDateValue(value)) {
    if (column.dateStyle === 'datetime') {
      return formatDateTime(value, tz) || '—'
    }
    return formatDate(value, tz) || '—'
  }

  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}
