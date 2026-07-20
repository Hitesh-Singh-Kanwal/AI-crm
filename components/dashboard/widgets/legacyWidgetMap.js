/** Map old composite dashboard widget ids → new atomic ids for layout migration. */
export const LEGACY_WIDGET_MAP = {
  'pipeline-activity': ['pipeline', 'weekly-activity', 'conversion-funnel'],
  'booking-trend-follow-up': ['booking-trend', 'follow-up-effectiveness'],
  'leads-and-studio-breakdown': ['leads-by-source', 'studio-breakdown'],
  'response-rate': ['response-rate-day', 'response-rate-time'],
}
