import { formatDate, formatDateTime } from '@/lib/utils'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/

function looksLikeDateValue(value) {
  if (value instanceof Date) return !Number.isNaN(value.getTime())
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed || trimmed === '—') return false
  if (!ISO_DATE_RE.test(trimmed)) return false
  const parsed = new Date(trimmed)
  return !Number.isNaN(parsed.getTime())
}

/**
 * Format a report table / drill / export cell for display.
 * Auto-formats ISO timestamps and Date objects; honors column.format when present.
 * Use column.dateStyle = 'datetime' to include time.
 */
export function formatReportCellValue(value, column = {}) {
  if (column.format) {
    try {
      return column.format(value)
    } catch {
      // fall through to default formatting
    }
  }

  if (value === null || value === undefined || value === '') return '—'

  if (looksLikeDateValue(value)) {
    if (column.dateStyle === 'datetime') {
      return formatDateTime(value) || '—'
    }
    return formatDate(value) || '—'
  }

  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}
