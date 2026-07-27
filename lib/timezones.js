/** US & territories location timezones (IANA identifiers). */

export const LOCATION_TIMEZONES = [
  {
    region: 'Eastern',
    value: 'America/New_York',
    utcOffset: 'UTC−5 / UTC−4',
  },
  {
    region: 'Central',
    value: 'America/Chicago',
    utcOffset: 'UTC−6 / UTC−5',
  },
  {
    region: 'Mountain',
    value: 'America/Denver',
    utcOffset: 'UTC−7 / UTC−6',
  },
  {
    region: 'Mountain (no DST)',
    value: 'America/Phoenix',
    utcOffset: 'UTC−7 (year-round)',
  },
  {
    region: 'Pacific',
    value: 'America/Los_Angeles',
    utcOffset: 'UTC−8 / UTC−7',
  },
  {
    region: 'Alaska',
    value: 'America/Anchorage',
    utcOffset: 'UTC−9 / UTC−8',
  },
  {
    region: 'Hawaii',
    value: 'Pacific/Honolulu',
    utcOffset: 'UTC−10 (no DST)',
  },
  {
    region: 'American Samoa',
    value: 'Pacific/Pago_Pago',
    utcOffset: 'UTC−11 (no DST)',
  },
  {
    region: 'Guam / N. Mariana Islands',
    value: 'Pacific/Guam',
    utcOffset: 'UTC+10 (no DST)',
  },
  {
    region: 'Puerto Rico / US Virgin Islands',
    value: 'America/Puerto_Rico',
    utcOffset: 'UTC−4 (no DST)',
  },
]

export const DEFAULT_LOCATION_TIMEZONE = 'America/New_York'

export function getTimezoneOption(iana) {
  if (!iana) return null
  return LOCATION_TIMEZONES.find((tz) => tz.value === iana) || null
}

export function formatTimezoneLabel(iana) {
  const opt = getTimezoneOption(iana)
  if (opt) return `${opt.region} (${opt.value})`
  return iana || '—'
}

export function getTimezoneSelectOptions() {
  return LOCATION_TIMEZONES.map((tz) => ({
    value: tz.value,
    label: `${tz.region} — ${tz.value}`,
    description: tz.utcOffset,
  }))
}
