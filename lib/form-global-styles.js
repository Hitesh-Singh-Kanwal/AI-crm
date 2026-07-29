/**
 * Global form styles: merge with field styles, embed/parse in exported HTML.
 */

export const FORM_GLOBAL_STYLES_META_PREFIX = 'FORM_BUILDER_GLOBAL_STYLES:'

const FORM_SURFACE_STYLE_KEYS = new Set([
  'formBgMode',
  'formBgColor',
  'formBgFrom',
  'formBgTo',
  'formBgAngle',
  'formBgPreset',
  'formPageBgMode',
  'formPageBgColor',
  'formPageBgPreset',
])

function omitEmptyStyles(obj = {}) {
  const out = {}
  for (const [key, value] of Object.entries(obj || {})) {
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out
}

/** Field-level globals only — form surface background keys are excluded. */
export function getFieldScopedGlobalStyles(globalStyles = {}) {
  const out = {}
  for (const [key, value] of Object.entries(globalStyles || {})) {
    if (FORM_SURFACE_STYLE_KEYS.has(key)) continue
    if (value === undefined || value === null || value === '') continue
    out[key] = value
  }
  return out
}

/** Cool ready-made form card backgrounds */
export const FORM_BG_PRESETS = [
  {
    id: 'clean',
    label: 'Clean white',
    background: '#ffffff',
  },
  {
    id: 'soft-mist',
    label: 'Soft mist',
    background: 'linear-gradient(160deg, #f8fafc 0%, #e2e8f0 100%)',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 55%, #0f172a 100%)',
  },
  {
    id: 'forest',
    label: 'Forest',
    background: 'linear-gradient(145deg, #166534 0%, #14532d 45%, #052e16 100%)',
  },
  {
    id: 'sunset',
    label: 'Sunset',
    background: 'linear-gradient(135deg, #fb923c 0%, #f43f5e 50%, #9f1239 100%)',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    background: 'linear-gradient(160deg, #1e293b 0%, #0f172a 60%, #020617 100%)',
  },
  {
    id: 'sand',
    label: 'Warm sand',
    background: 'linear-gradient(145deg, #fff7ed 0%, #fed7aa 55%, #fdba74 100%)',
  },
  {
    id: 'mint',
    label: 'Mint glass',
    background: 'linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 50%, #6ee7b7 100%)',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    background:
      'radial-gradient(ellipse at 20% 20%, rgba(56,189,248,0.55), transparent 50%), radial-gradient(ellipse at 80% 0%, rgba(52,211,153,0.45), transparent 45%), linear-gradient(160deg, #0f172a 0%, #134e4a 100%)',
  },
  {
    id: 'mesh',
    label: 'Color mesh',
    background:
      'radial-gradient(at 0% 0%, #fda4af 0px, transparent 50%), radial-gradient(at 100% 0%, #93c5fd 0px, transparent 50%), radial-gradient(at 100% 100%, #fde68a 0px, transparent 50%), radial-gradient(at 0% 100%, #c4b5fd 0px, transparent 50%), #f8fafc',
  },
  {
    id: 'noir-gold',
    label: 'Noir gold',
    background: 'linear-gradient(145deg, #18181b 0%, #27272a 40%, #422006 100%)',
  },
  {
    id: 'sky-burst',
    label: 'Sky burst',
    background:
      'radial-gradient(circle at top left, #bae6fd, transparent 45%), radial-gradient(circle at bottom right, #fef08a, transparent 40%), linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)',
  },
]

export const FORM_PAGE_BG_PRESETS = [
  { id: 'slate', label: 'Slate', background: '#f8fafc' },
  { id: 'ink', label: 'Ink', background: '#0f172a' },
  {
    id: 'dawn',
    label: 'Dawn',
    background: 'linear-gradient(180deg, #fff7ed 0%, #fce7f3 50%, #e0f2fe 100%)',
  },
  {
    id: 'deep-sea',
    label: 'Deep sea',
    background: 'linear-gradient(180deg, #082f49 0%, #0c4a6e 40%, #020617 100%)',
  },
  {
    id: 'paper',
    label: 'Paper',
    background:
      'repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(15,23,42,0.04) 24px), #fafaf9',
  },
]

function findPreset(list, id) {
  return list.find((p) => p.id === id) || null
}

/**
 * Resolve form card background CSS for canvas / export.
 */
export function resolveFormBackground(styles = {}) {
  const mode = styles.formBgMode || 'solid'

  if (mode === 'preset') {
    const preset = findPreset(FORM_BG_PRESETS, styles.formBgPreset || 'clean')
    return {
      background: preset?.background || '#ffffff',
    }
  }

  if (mode === 'gradient') {
    const from = styles.formBgFrom || '#0ea5e9'
    const to = styles.formBgTo || '#0369a1'
    const angle = styles.formBgAngle || '135'
    return {
      background: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`,
    }
  }

  return {
    background: styles.formBgColor || '#ffffff',
  }
}

/** Page/body backdrop behind the form in exported HTML */
export function resolveFormPageBackground(styles = {}) {
  const mode = styles.formPageBgMode || 'default'

  if (mode === 'solid') {
    return { background: styles.formPageBgColor || '#f8fafc' }
  }

  if (mode === 'preset') {
    const preset = findPreset(FORM_PAGE_BG_PRESETS, styles.formPageBgPreset || 'slate')
    return { background: preset?.background || '#f8fafc' }
  }

  if (mode === 'match') {
    return resolveFormBackground(styles)
  }

  return { background: '#f8fafc' }
}

export function buildFormContainerCss(styles = {}) {
  const { background } = resolveFormBackground(styles)
  return `background: ${background};`
}

export function buildFormPageCss(styles = {}) {
  const { background } = resolveFormPageBackground(styles)
  return `background: ${background};`
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
    ...getFieldScopedGlobalStyles(globalStyles),
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
