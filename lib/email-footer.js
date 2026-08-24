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
 * one dark table, centered light text — identity, phone, unsub, copyright.
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

const FOOTER_OPEN_RE =
  /<table\b[^>]*\sdata-cadance-studio-footer(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))?[^>]*>/i

/** Balanced extract of the full footer table (never stops at an inner </div>). */
export function extractStudioFooterBlock(html) {
  const source = String(html || '')
  const open = source.match(FOOTER_OPEN_RE)
  if (!open) return null
  const start = open.index
  let depth = 0
  const tagRe = /<\/?table\b[^>]*>/gi
  tagRe.lastIndex = start
  let m
  while ((m = tagRe.exec(source))) {
    if (/^<\//.test(m[0])) {
      depth -= 1
      if (depth === 0) return source.slice(start, m.index + m[0].length)
    } else {
      depth += 1
    }
  }
  return null
}

export function stripInjectedFooter(html) {
  let out = String(html || '')

  for (;;) {
    const block = extractStudioFooterBlock(out)
    if (!block) break
    out = out.split(block).join('')
  }

  out = out.replace(/<table\b[^>]*\sdata-cadance-studio-footer\b[^>]*>[\s\S]*$/i, '')
  out = out.replace(/<div[^>]*\sdata-cadance-unsub-links\b[^>]*>[\s\S]*?<\/div>/gi, '')
  out = out.replace(
    /<div[^>]*style="[^"]*color:\s*#9a9a9a[^"]*"[^>]*>\s*©[\s\S]*?<\/div>/gi,
    '',
  )
  out = out.replace(/<\/td>\s*<\/tr>\s*<\/table>(?=\s*<\/(?:td|body|html)>)/i, '')

  return out.replace(/\n{3,}/g, '\n\n').trimEnd()
}

export function getInjectedFooterLocationId(html) {
  const match = String(html || '').match(
    /data-cadance-studio-footer\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
  )
  if (!match) return null
  return String(match[1] || match[2] || match[3] || '').trim() || null
}

/** True when the template HTML already contains a saved studio footer. */
export function htmlHasStudioFooter(html) {
  return Boolean(getInjectedFooterLocationId(html))
}

/**
 * Place the location footer inside the main email content (same column/cell),
 * not as a detached sibling — that makes Gmail clip it behind "…".
 */
export function nestStudioFooterInEmailHtml(html, footerBlock) {
  if (!footerBlock) return html
  const source = stripInjectedFooter(String(html || ''))
  if (!source.trim()) return footerBlock

  if (/\bcrm-email-pad\b/i.test(source)) {
    const nested = source.replace(
      /(<td\b[^>]*\bcrm-email-pad\b[^>]*>)([\s\S]*)(<\/td>\s*<\/tr>\s*<\/table>\s*<\/td>\s*<\/tr>\s*<\/table>\s*<\/body>)/i,
      `$1$2\n${footerBlock}\n$3`,
    )
    if (nested !== source) return nested
  }

  const bodyOpen = source.match(/<body\b[^>]*>/i)
  if (bodyOpen) {
    const start = bodyOpen.index + bodyOpen[0].length
    const endRel = source.slice(start).search(/<\/body\s*>/i)
    if (endRel >= 0) {
      const end = start + endRel
      const before = source.slice(0, start)
      const bodyInner = source.slice(start, end)
      const after = source.slice(end)
      const trimmed = bodyInner.trim()

      const outerTable = trimmed.match(/^(<table\b[^>]*>)([\s\S]*)(<\/table>)$/i)
      if (outerTable) {
        const merged =
          `${outerTable[1]}${outerTable[2]}` +
          `<tr><td style="padding:0;margin:0;border:0;">${footerBlock}</td></tr>` +
          `${outerTable[3]}`
        return `${before}\n${merged}\n${after}`
      }

      const wrapped =
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" ` +
        `style="width:100%;border-collapse:collapse;border-spacing:0;margin:0;padding:0">` +
        `<tr><td style="padding:0;margin:0;border:0;">${trimmed}\n${footerBlock}</td></tr></table>`
      return `${before}\n${wrapped}\n${after}`
    }
  }

  return `${source}\n${footerBlock}`
}

/** Inject location footer as one continuous dark bar with the email body. */
export function injectFooterIntoHtml(html, loc) {
  const block = buildLocationFooterBlockHtml(loc)
  if (!block) return stripInjectedFooter(html)
  return nestStudioFooterInEmailHtml(html, block)
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
