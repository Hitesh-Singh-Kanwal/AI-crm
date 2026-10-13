/**
 * Lead source (utm_source). Form leads get it automatically from the ad /
 * referral that brought the visitor; the builder's Source field is a fallback.
 */

/** Options of the form builder's manual Source field. */
export const FORM_SOURCE_FIELD_VALUES = ['google-add', 'website']

/** Common sources offered in lead filters. */
export const LEAD_SOURCE_OPTIONS = [
  'facebook',
  'instagram',
  'google',
  'google-add',
  'bing',
  'tiktok',
  'linkedin',
  'youtube',
  'twitter',
  'website',
]

const LABELS = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  messenger: 'Messenger',
  audience_network: 'Meta Audience Network',
  google: 'Google',
  'google-add': 'Google Ads',
  bing: 'Bing',
  yahoo: 'Yahoo',
  duckduckgo: 'DuckDuckGo',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  twitter: 'X (Twitter)',
  website: 'Website',
  direct: 'Direct / unknown',
}

export function formatLeadSource(value) {
  const key = String(value ?? '').trim().toLowerCase()
  if (!key) return ''
  if (LABELS[key]) return LABELS[key]
  // Referral sources are hostnames (blog.example.com) — show as-is.
  if (key.includes('.')) return key
  return key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export const leadSourceOptions = (values = LEAD_SOURCE_OPTIONS) =>
  values.map((value) => ({ value, label: formatLeadSource(value) }))
