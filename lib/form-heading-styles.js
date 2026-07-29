/**
 * Build React style objects for form-builder heading elements.
 * Box styles (background, size, spacing, border) sit on a wrapper;
 * typography sits on the heading tag so background always paints as a block.
 */

function isVisibleBackground(value) {
  if (value == null || value === '') return false
  const v = String(value).trim().toLowerCase()
  return v !== 'transparent' && v !== 'none'
}

export function buildHeadingBoxStyle(styles = {}) {
  const hasBg = isVisibleBackground(styles.backgroundColor)
  const s = {
    boxSizing: 'border-box',
    display: styles.display || 'block',
    width: styles.width || '100%',
    marginTop: styles.marginTop || '0',
    marginBottom: styles.marginBottom || '0',
    marginLeft: styles.marginLeft || '0',
    marginRight: styles.marginRight || '0',
  }

  if (hasBg) {
    s.backgroundColor = styles.backgroundColor
  } else if (styles.backgroundColor) {
    s.backgroundColor = 'transparent'
  }

  if (styles.height) s.height = styles.height
  if (styles.minHeight) s.minHeight = styles.minHeight
  if (styles.maxWidth) s.maxWidth = styles.maxWidth

  // Default padding when a background is set so the color is visibly a block
  s.paddingTop = styles.paddingTop || (hasBg ? '8px' : '0')
  s.paddingRight = styles.paddingRight || (hasBg ? '12px' : '0')
  s.paddingBottom = styles.paddingBottom || (hasBg ? '8px' : '0')
  s.paddingLeft = styles.paddingLeft || (hasBg ? '12px' : '0')

  const blockAlign = styles.blockAlign || styles.textAlign
  const width = styles.width || '100%'
  if (width !== '100%' && width !== 'auto' && !styles.marginLeft && !styles.marginRight) {
    if (blockAlign === 'center') {
      s.marginLeft = 'auto'
      s.marginRight = 'auto'
    } else if (blockAlign === 'right') {
      s.marginLeft = 'auto'
      s.marginRight = '0'
    } else if (blockAlign === 'left') {
      s.marginLeft = '0'
      s.marginRight = 'auto'
    }
  }

  if (styles.borderWidth) {
    s.borderWidth = styles.borderWidth
    s.borderStyle = styles.borderStyle || 'solid'
    if (styles.borderColor) s.borderColor = styles.borderColor
  } else if (styles.borderStyle && styles.borderStyle !== 'none') {
    s.borderStyle = styles.borderStyle
    if (styles.borderColor) s.borderColor = styles.borderColor
  }
  if (styles.borderRadius) {
    s.borderRadius = styles.borderRadius
    s.overflow = 'hidden'
  }

  return s
}

export function buildHeadingTextStyle(styles = {}) {
  const s = {
    margin: 0,
    fontSize: styles.fontSize || '1.5rem',
    fontWeight: styles.fontWeight || 600,
    color: styles.color || '#0f172a',
    lineHeight: styles.lineHeight || '1.3',
    backgroundColor: 'transparent',
  }

  if (styles.fontFamily) s.fontFamily = styles.fontFamily
  if (styles.textAlign) s.textAlign = styles.textAlign
  if (styles.letterSpacing) s.letterSpacing = styles.letterSpacing
  if (styles.textTransform) s.textTransform = styles.textTransform

  return s
}

/** @deprecated Prefer box + text styles; kept for callers that need one object */
export function buildHeadingReactStyle(styles = {}) {
  const box = buildHeadingBoxStyle(styles)
  const text = buildHeadingTextStyle(styles)
  return { ...box, ...text, backgroundColor: box.backgroundColor }
}

/** CSS declaration string for HTML export */
export function buildHeadingCssString(styles = {}) {
  const obj = buildHeadingReactStyle(styles)
  return Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => {
      const prop = k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)
      return `${prop}: ${v}`
    })
    .join('; ')
}

export const HEADING_LEVELS = [
  { value: 'h1', label: 'Heading 1', defaultSize: '32px' },
  { value: 'h2', label: 'Heading 2', defaultSize: '24px' },
  { value: 'h3', label: 'Heading 3', defaultSize: '20px' },
  { value: 'h4', label: 'Heading 4', defaultSize: '18px' },
]

export function resolveHeadingTag(level) {
  return ['h1', 'h2', 'h3', 'h4'].includes(level) ? level : 'h2'
}
