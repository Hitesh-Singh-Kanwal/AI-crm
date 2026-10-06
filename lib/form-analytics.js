export const FORM_ANALYTICS_RANGES = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '7d', label: 'Last 7 days' },
]

export function normalizeFormAnalyticsRange(value) {
  return FORM_ANALYTICS_RANGES.some((r) => r.value === value) ? value : '30d'
}
