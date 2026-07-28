/**
 * Global form styles: merge with field styles, embed/parse in exported HTML.
 */

export const FORM_GLOBAL_STYLES_META_PREFIX = 'FORM_BUILDER_GLOBAL_STYLES:'

function omitEmptyStyles(obj = {}) {
  const out = {}
  for (const [key, value] of Object.entries(obj || {})) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out
}

/** Stable key for exclude list (survives re-import better than ephemeral ids). */
export function getGlobalStyleExcludeKey(field) {
  if (!field) return ''
  if (field.id === 'submit-button' || field.type === 'submit') return 'submit'
  if (field.type === 'heading') {
    const label = String(field.label || 'Heading').trim() || 'Heading'
    return `heading:${label}`
  }
  if (field.type === 'captcha') return 'captcha'
  if (field.propertyKind === 'metadata' || field.metadataKey) {
    const key =
      String(field.metadataKey || 'custom')
        .replace(/[^\w.-]/g, '_')
        .replace(/^_+|_+$/g, '') || 'custom'
    return `metadata.${key}`
  }
  if (field.name && !String(field.name).startsWith('metadata.')) return field.name
  if (field.name?.startsWith('metadata.')) return field.name
  return String(field.id || field.label || 'field')
}

export function isExcludedFromGlobalStyles(field, excludeKeys = []) {
  if (!field) return false
  if (field.excludeFromGlobalStyles) return true
  const key = getGlobalStyleExcludeKey(field)
  return Boolean(key && Array.isArray(excludeKeys) && excludeKeys.includes(key))
}

/** Field styles override global; excluded fields ignore global entirely. Empty values are ignored. */
export function mergeFieldStyles(globalStyles = {}, fieldStyles = {}, excluded = false) {
  if (excluded) return omitEmptyStyles(fieldStyles)
  return {
    ...omitEmptyStyles(globalStyles),
    ...omitEmptyStyles(fieldStyles),
  }
}

/** Label / heading text styles from effective field styles */
export function buildLabelReactStyle(styles = {}) {
  const s = {
    fontWeight: styles.fontWeight || '500',
    color: styles.color || '#334155',
    fontSize: styles.fontSize || '0.875rem',
  }
  if (styles.fontFamily) s.fontFamily = styles.fontFamily
  if (styles.letterSpacing) s.letterSpacing = styles.letterSpacing
  if (styles.textAlign) s.textAlign = styles.textAlign
  if (styles.textTransform) s.textTransform = styles.textTransform
  return s
}

/** Input / control box styles including typography */
export function buildInputReactStyle(styles = {}) {
  const s = {
    backgroundColor: styles.backgroundColor || '#ffffff',
    padding: `${styles.paddingTop || '0.5rem'} ${styles.paddingRight || '0.75rem'} ${styles.paddingBottom || '0.5rem'} ${styles.paddingLeft || '0.75rem'}`,
    borderWidth: styles.borderWidth || '1px',
    borderStyle: styles.borderStyle || 'solid',
    borderColor: styles.borderColor || '#e2e8f0',
    borderRadius: styles.borderRadius || '0.375rem',
    width: styles.width || '100%',
    margin: `${styles.marginTop || '0'} ${styles.marginRight || '0'} ${styles.marginBottom || '0'} ${styles.marginLeft || '0'}`,
    boxSizing: 'border-box',
  }
  if (styles.fontFamily) s.fontFamily = styles.fontFamily
  if (styles.fontSize) s.fontSize = styles.fontSize
  if (styles.fontWeight) s.fontWeight = styles.fontWeight
  if (styles.color) s.color = styles.color
  if (styles.textAlign) s.textAlign = styles.textAlign
  if (styles.letterSpacing) s.letterSpacing = styles.letterSpacing
  if (styles.textTransform) s.textTransform = styles.textTransform
  return s
}

/** CSS declaration string for exported inputs */
export function buildInputCssString(styles = {}) {
  const obj = buildInputReactStyle(styles)
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${v}`)
    .join('; ')
}

/** CSS declaration string for exported labels */
export function buildLabelCssString(styles = {}) {
  const obj = buildLabelReactStyle(styles)
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}: ${v}`)
    .join('; ')
}

export function embedGlobalStylesMeta(styles = {}, excludeKeys = []) {
  const payload = {
    styles: styles || {},
    excludeKeys: Array.isArray(excludeKeys) ? excludeKeys : [],
  }
  return `<!--${FORM_GLOBAL_STYLES_META_PREFIX}${JSON.stringify(payload)}-->`
}

export function parseGlobalStylesMeta(html = '') {
  const empty = { styles: {}, excludeKeys: [] }
  if (!html) return empty
  const marker = FORM_GLOBAL_STYLES_META_PREFIX
  const start = html.indexOf(`<!--${marker}`)
  if (start === -1) return empty
  const jsonStart = start + 4 + marker.length
  const end = html.indexOf('-->', jsonStart)
  if (end === -1) return empty
  try {
    const raw = html.slice(jsonStart, end).trim()
    const parsed = JSON.parse(raw)
    return {
      styles: parsed?.styles && typeof parsed.styles === 'object' ? parsed.styles : {},
      excludeKeys: Array.isArray(parsed?.excludeKeys) ? parsed.excludeKeys : [],
    }
  } catch {
    return empty
  }
}
