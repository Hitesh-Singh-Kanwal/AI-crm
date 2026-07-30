import { toCalendarDateStringInTimeZone, toLocalCalendarDateString } from '@/lib/utils'

const FILTER_KEYS = [
  'dateFrom',
  'dateTo',
  'datePreset',
  'studioId',
  'teacherId',
  'programId',
  'leadSource',
  'groupBy',
  'comparison',
  'activeWindowDays',
  'status',
]

function getValidReportConditions(conditions = []) {
  return (conditions || []).filter((c) => {
    if (!c?.field) return false
    if (typeof c.value === 'object' && c.value && !Array.isArray(c.value)) {
      return String(c.value.from ?? '').trim() !== '' && String(c.value.to ?? '').trim() !== ''
    }
    if (Array.isArray(c.value)) return c.value.length > 0
    return String(c.value ?? '').trim() !== ''
  })
}

export function buildReportQuery(filters = {}, { page = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams()
  for (const key of FILTER_KEYS) {
    const value = filters[key]
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value)
    }
  }
  const validConditions = getValidReportConditions(filters.conditions)
  if (validConditions.length > 0) {
    params.set('conditions', JSON.stringify(validConditions))
    params.set('conditionLogic', filters.conditionLogic === 'OR' ? 'OR' : 'AND')
  }
  const trimmedSearch = String(filters.search ?? '').trim()
  if (trimmedSearch) params.set('search', trimmedSearch)
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))
  return params.toString()
}

export function parseReportFiltersFromSearchParams(searchParams) {
  const result = {}
  for (const key of FILTER_KEYS) {
    result[key] = searchParams.get(key) || ''
  }
  const conditionsRaw = searchParams.get('conditions')
  try {
    result.conditions = conditionsRaw ? JSON.parse(conditionsRaw) : []
  } catch {
    result.conditions = []
  }
  result.conditionLogic = searchParams.get('conditionLogic') === 'OR' ? 'OR' : 'AND'
  result.search = searchParams.get('search') || ''
  return result
}

/**
 * Convert a preset day count into YYYY-MM-DD from/to bounds (inclusive trailing window).
 * Uses studio timezone when provided so US studios don't shift to UTC "tomorrow".
 */
export function dateBoundsFromPresetDays(days, timeZone) {
  const now = new Date()
  const toStr = timeZone
    ? toCalendarDateStringInTimeZone(now, timeZone)
    : toLocalCalendarDateString(now)

  // Walk back N local/studio calendar days without UTC conversion.
  const toParts = toStr.split('-').map(Number)
  const cursor = new Date(toParts[0], toParts[1] - 1, toParts[2])
  cursor.setDate(cursor.getDate() - Number(days))
  const fromStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`

  return {
    dateFrom: fromStr,
    dateTo: toStr,
  }
}

export { FILTER_KEYS }
