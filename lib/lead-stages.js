/** Canonical lead stage values used by the backend API. */
export const LEAD_STAGE_VALUES = [
  'new',
  'engaged',
  'cold',
  'booked',
  'converted',
  'no_show',
  'qualified',
  'disqualified',
  'human intervention',
  'pending_payment',
  'needs_reschedule',
  'rescheduled',
  'declined',
  'no_sale',
  'dormant',
]

/** @deprecated Prefer LEAD_STAGE_VALUES — kept as an alias for existing imports. */
export const STAGE_OPTIONS = LEAD_STAGE_VALUES

/** @deprecated Prefer LEAD_STAGE_VALUES — kept as an alias for existing imports. */
export const LEAD_STAGE_OPTIONS = LEAD_STAGE_VALUES

/** @deprecated Prefer LEAD_STAGE_VALUES — kept as an alias for existing imports. */
export const CAMPAIGN_LEAD_STAGE_OPTIONS = LEAD_STAGE_VALUES

/** Display label for a backend stage value (e.g. no_show → "No Show"). */
export function formatLeadStageLabel(value) {
  if (value === null || value === undefined) return ''
  const str = String(value).trim()
  if (!str) return ''
  return str
    .replace(/[_-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/** Dropdown-ready options: `{ value, label }[]` */
export function getLeadStageOptions() {
  return LEAD_STAGE_VALUES.map((value) => ({
    value,
    label: formatLeadStageLabel(value),
  }))
}
