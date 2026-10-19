export const FORM_ANALYTICS_RANGES = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
]

export function normalizeFormAnalyticsRange(value) {
  return FORM_ANALYTICS_RANGES.some((r) => r.value === value) ? value : '30d'
}

export function formAnalyticsReady({ range, from, to }) {
  return range !== 'custom' || (Boolean(from) && Boolean(to) && from <= to)
}

export function formAnalyticsQuery({ range, from, to }) {
  const params = new URLSearchParams({ range: normalizeFormAnalyticsRange(range) })
  if (range === 'custom' && from && to) {
    params.set('from', from)
    params.set('to', to)
  }
  return params.toString()
}
