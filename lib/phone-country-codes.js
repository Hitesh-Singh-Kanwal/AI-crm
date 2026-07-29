/** Common dial codes for form phone fields. Value is E.164 prefix (e.g. +1). */
export const PHONE_COUNTRY_CODES = [
  { code: '+1', iso: 'US', label: 'United States' },
  { code: '+1', iso: 'CA', label: 'Canada' },
  { code: '+91', iso: 'IN', label: 'India' },
  { code: '+44', iso: 'GB', label: 'United Kingdom' },
  { code: '+61', iso: 'AU', label: 'Australia' },
  { code: '+971', iso: 'AE', label: 'United Arab Emirates' },
  { code: '+966', iso: 'SA', label: 'Saudi Arabia' },
  { code: '+65', iso: 'SG', label: 'Singapore' },
  { code: '+60', iso: 'MY', label: 'Malaysia' },
  { code: '+63', iso: 'PH', label: 'Philippines' },
  { code: '+62', iso: 'ID', label: 'Indonesia' },
  { code: '+66', iso: 'TH', label: 'Thailand' },
  { code: '+81', iso: 'JP', label: 'Japan' },
  { code: '+82', iso: 'KR', label: 'South Korea' },
  { code: '+86', iso: 'CN', label: 'China' },
  { code: '+852', iso: 'HK', label: 'Hong Kong' },
  { code: '+49', iso: 'DE', label: 'Germany' },
  { code: '+995', iso: 'GE', label: 'Georgia' },
  { code: '+33', iso: 'FR', label: 'France' },
  { code: '+39', iso: 'IT', label: 'Italy' },
  { code: '+34', iso: 'ES', label: 'Spain' },
  { code: '+31', iso: 'NL', label: 'Netherlands' },
  { code: '+46', iso: 'SE', label: 'Sweden' },
  { code: '+47', iso: 'NO', label: 'Norway' },
  { code: '+41', iso: 'CH', label: 'Switzerland' },
  { code: '+7', iso: 'RU', label: 'Russia' },
  { code: '+55', iso: 'BR', label: 'Brazil' },
  { code: '+52', iso: 'MX', label: 'Mexico' },
  { code: '+27', iso: 'ZA', label: 'South Africa' },
  { code: '+234', iso: 'NG', label: 'Nigeria' },
  { code: '+254', iso: 'KE', label: 'Kenya' },
  { code: '+92', iso: 'PK', label: 'Pakistan' },
  { code: '+880', iso: 'BD', label: 'Bangladesh' },
  { code: '+94', iso: 'LK', label: 'Sri Lanka' },
  { code: '+977', iso: 'NP', label: 'Nepal' },
  { code: '+64', iso: 'NZ', label: 'New Zealand' },
  { code: '+353', iso: 'IE', label: 'Ireland' },
  { code: '+48', iso: 'PL', label: 'Poland' },
  { code: '+90', iso: 'TR', label: 'Turkey' },
  { code: '+20', iso: 'EG', label: 'Egypt' },
  { code: '+972', iso: 'IL', label: 'Israel' },
  { code: '+351', iso: 'PT', label: 'Portugal' },
  { code: '+32', iso: 'BE', label: 'Belgium' },
  { code: '+43', iso: 'AT', label: 'Austria' },
  { code: '+45', iso: 'DK', label: 'Denmark' },
  { code: '+358', iso: 'FI', label: 'Finland' },
  { code: '+420', iso: 'CZ', label: 'Czech Republic' },
  { code: '+36', iso: 'HU', label: 'Hungary' },
  { code: '+30', iso: 'GR', label: 'Greece' },
  { code: '+40', iso: 'RO', label: 'Romania' },
  { code: '+380', iso: 'UA', label: 'Ukraine' },
  { code: '+84', iso: 'VN', label: 'Vietnam' },
  { code: '+98', iso: 'IR', label: 'Iran' },
  { code: '+964', iso: 'IQ', label: 'Iraq' },
  { code: '+962', iso: 'JO', label: 'Jordan' },
  { code: '+965', iso: 'KW', label: 'Kuwait' },
  { code: '+974', iso: 'QA', label: 'Qatar' },
  { code: '+968', iso: 'OM', label: 'Oman' },
  { code: '+973', iso: 'BH', label: 'Bahrain' },
]

export const DEFAULT_PHONE_COUNTRY_CODE = '+1'
export const DEFAULT_PHONE_COUNTRY_ISO = 'US'

/** ISO 3166-1 alpha-2 → flag emoji */
export function isoToFlagEmoji(iso) {
  const code = String(iso || '').toUpperCase()
  if (!/^[A-Z]{2}$/.test(code)) return '🏳️'
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)))
}

/** Unique options for country picker (same dial code may appear for US/CA). */
export function getPhoneCountryCodeOptions() {
  const seen = new Set()
  const options = []
  for (const row of PHONE_COUNTRY_CODES) {
    const key = `${row.code}|${row.iso}`
    if (seen.has(key)) continue
    seen.add(key)
    options.push({
      value: row.code,
      label: `${row.label} (${row.code})`,
      shortLabel: `${row.iso} ${row.code}`,
      listLabel: `${row.label} (${row.code})`,
      iso: row.iso,
      code: row.code,
      name: row.label,
      flag: isoToFlagEmoji(row.iso),
    })
  }
  return options
}

export function findPhoneCountryOption(code, iso) {
  const options = getPhoneCountryCodeOptions()
  if (iso) {
    const byIso = options.find((o) => o.iso === iso)
    if (byIso) return byIso
  }
  return options.find((o) => o.code === code) || options.find((o) => o.code === DEFAULT_PHONE_COUNTRY_CODE) || options[0]
}

/**
 * Combine dial code + national number into E.164 (+91698…).
 * Strips leading 0 from national number and avoids duplicating the dial code.
 */
export function toE164Phone(countryCode, nationalNumber) {
  const codeDigits = String(countryCode || '').replace(/\D/g, '')
  let national = String(nationalNumber || '').replace(/\D/g, '')
  if (!national) return ''
  // Drop leading zero (common local format)
  if (national.startsWith('0')) national = national.replace(/^0+/, '')
  // If user already typed country code into the number field
  if (codeDigits && national.startsWith(codeDigits)) {
    national = national.slice(codeDigits.length)
  }
  if (!national) return codeDigits ? `+${codeDigits}` : ''
  return `+${codeDigits}${national}`
}
