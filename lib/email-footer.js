/**
 * Studio email footers — fixed dark centered design (name · address · city;
 * phone; Unsubscribe · Manage preferences; © year).
 * Real unsubscribe URLs are injected by the backend at send time.
 */

export const CADANCE_FOOTER_ATTR = 'data-cadance-studio-footer'

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function locationHasFooterContent(loc) {
  if (!loc) return false
  return Boolean(
    loc.name ||
      loc.footerPhone ||
      loc.phoneNumber ||
      loc.address ||
      loc.city ||
      loc.state ||
      loc.zip,
  )
}

function cityStateZip(loc) {
  return [loc?.city, [loc?.state, loc?.zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
}

function footerIdentityParts(loc) {
  const parts = []
  if (loc?.name) parts.push(String(loc.name).trim())
  if (loc?.address) parts.push(String(loc.address).trim())
  const csz = cityStateZip(loc)
  if (csz) parts.push(csz)
  return parts.filter(Boolean)
}

function footerPhone(loc) {
  return String(loc?.footerPhone || loc?.phoneNumber || '').trim()
}

function unsubscribePlaceholderHtml() {
  // Placeholder — backend replaces data-cadance-unsub-links with tokenized URLs on send.
  return (
    `<div data-cadance-unsub-links="1" style="margin:0 0 10px;color:#c8c8c8;font-size:13px;line-height:1.55">` +
    `Unsubscribe · Manage preferences` +
    `</div>`
  )
}

/** Plain-text preview (matches injected design). */
export function buildLocationFooterText(loc) {
  if (!loc || !locationHasFooterContent(loc)) return ''
  const lines = []
  const identity = footerIdentityParts(loc)
  if (identity.length) lines.push(identity.join(' · '))
  const phone = footerPhone(loc)
  if (phone) lines.push(phone)
  lines.push('Unsubscribe · Manage preferences')
  const name = String(loc.name || '').trim() || 'Studio'
  lines.push(`© ${new Date().getFullYear()} ${name}. All rights reserved.`)
  return lines.join('\n')
}

/**
 * Fixed design footer block:
 * dark bar, centered light text, middle-dot separators, unsubscribe row, copyright.
 */
export function buildLocationFooterBlockHtml(loc) {
  if (!locationHasFooterContent(loc)) return ''

  const id = escapeHtml(String(loc?._id || loc?.id || ''))
  const identity = footerIdentityParts(loc)
    .map((part) => escapeHtml(part))
    .join(' · ')
  const phone = footerPhone(loc)
  const name = String(loc.name || '').trim() || 'Studio'
  const year = new Date().getFullYear()

  const rows = []
  if (identity) {
    rows.push(
      `<div style="margin:0 0 10px;color:#c8c8c8;font-size:13px;line-height:1.55">${identity}</div>`,
    )
  }
  if (phone) {
    rows.push(
      `<div style="margin:0 0 10px;color:#c8c8c8;font-size:13px;line-height:1.55">${escapeHtml(phone)}</div>`,
    )
  }
  rows.push(unsubscribePlaceholderHtml())
  rows.push(
    `<div style="margin:0;color:#9a9a9a;font-size:12px;line-height:1.55">© ${year} ${escapeHtml(name)}. All rights reserved.</div>`,
  )

  return (
    `<table ${CADANCE_FOOTER_ATTR}="${id}" role="presentation" width="100%" ` +
    `cellpadding="0" cellspacing="0" border="0" ` +
    `style="width:100%;border-collapse:collapse;background-color:#1c1c1c;margin:0;padding:0">` +
    `<tr><td align="center" ` +
    `style="padding:36px 28px;text-align:center;font-family:Arial,Helvetica,sans-serif;` +
    `background-color:#1c1c1c;color:#c8c8c8">` +
    `${rows.join('')}` +
    `</td></tr></table>`
  )
}

const FOOTER_BLOCK_RE =
  /<(?:table|div)[^>]*\sdata-cadance-studio-footer(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))?[^>]*>[\s\S]*?<\/(?:table|div)>/gi

export function stripInjectedFooter(html) {
  return String(html || '')
    .replace(FOOTER_BLOCK_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd()
}

export function getInjectedFooterLocationId(html) {
  const match = String(html || '').match(
    /data-cadance-studio-footer\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
  )
  if (!match) return null
  return String(match[1] || match[2] || match[3] || '').trim() || null
}

/** Always inject at the absolute end of the HTML (before </body> when present). */
export function injectFooterIntoHtml(html, loc) {
  const block = buildLocationFooterBlockHtml(loc)
  if (!block) return stripInjectedFooter(html)

  const base = stripInjectedFooter(String(html || '')).replace(/\s*$/, '')
  if (!base) return block

  if (/<\/body\s*>/i.test(base)) {
    return base.replace(/<\/body\s*>/i, `\n${block}\n</body>`)
  }

  return `${base}\n${block}`
}

/**
 * Locations available for footer pick:
 * - If a branch is selected in the header → only that location
 * - If "All branches" → every location with footer fields filled
 */
export function filterLocationsForFooterPicker(locations = [], effectiveBranchId = null) {
  const list = Array.isArray(locations) ? locations : []
  if (effectiveBranchId) {
    return list.filter((loc) => String(loc?._id) === String(effectiveBranchId))
  }
  return list.filter(locationHasFooterContent)
}
