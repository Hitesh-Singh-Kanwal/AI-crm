/** Hide tags inside HTML comments so MSO `<!--[if mso]><body>` is not treated as the real body. */
export function maskHtmlComments(html) {
  return String(html || '').replace(/<!--[\s\S]*?-->/g, (block) => ' '.repeat(block.length))
}

function lastIndexOfTag(masked, pattern) {
  const re = new RegExp(pattern, 'gi')
  let last = -1
  let match
  while ((match = re.exec(masked))) last = match.index
  return last
}

/**
 * Split a full HTML document on the real <body>, ignoring Outlook conditional comments.
 * Designed templates often contain `<!--[if mso]><body>…</body><![endif]-->` inside the
 * real body — a naive /<body>/ regex then extracts the wrong slice and wipes edits.
 */
export function splitHtmlDocument(sourceHtml) {
  const raw = String(sourceHtml || '')
  const masked = maskHtmlComments(raw)
  const openMatch = /<body\b[^>]*>/i.exec(masked)
  if (!openMatch || openMatch.index == null) {
    return { isDocument: false, prefix: '', inner: raw, suffix: '', headInner: '' }
  }
  const openEnd = openMatch.index + openMatch[0].length
  const closeStart = lastIndexOfTag(masked, '<\\/body\\s*>')
  if (closeStart < openEnd) {
    return { isDocument: false, prefix: '', inner: raw, suffix: '', headInner: '' }
  }
  const headOpen = /<head\b[^>]*>/i.exec(masked)
  const headClose = lastIndexOfTag(masked, '<\\/head\\s*>')
  let headInner = ''
  if (headOpen && headOpen.index != null && headClose > headOpen.index) {
    const headOpenEnd = headOpen.index + headOpen[0].length
    headInner = raw.slice(headOpenEnd, headClose)
  }
  return {
    isDocument: true,
    prefix: raw.slice(0, openEnd),
    inner: raw.slice(openEnd, closeStart),
    suffix: raw.slice(closeStart),
    headInner,
  }
}

export function extractEditableHtml(sourceHtml) {
  const split = splitHtmlDocument(sourceHtml)
  if (split.isDocument) return split.inner
  const raw = String(sourceHtml || '')
  const masked = maskHtmlComments(raw)
  if (/<!DOCTYPE|<html[\s>]/i.test(masked)) {
    return raw
      .replace(/<!DOCTYPE[^>]*>/i, '')
      .replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<\/?html[^>]*>/gi, '')
      .replace(/<\/?body[^>]*>/gi, '')
  }
  return raw
}

export function applyEditedInner(sourceHtml, nextInner) {
  const split = splitHtmlDocument(sourceHtml)
  if (!split.isDocument) return nextInner
  return `${split.prefix}${nextInner}${split.suffix}`
}

export function extractHeadStyles(sourceHtml) {
  const head = splitHtmlDocument(sourceHtml).headInner
  if (!head) return ''
  const styles = String(head).match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || []
  return styles.join('\n')
}

export function stripEditorSelectionChrome(root) {
  if (!root?.querySelectorAll) return
  root.querySelectorAll('img[data-crm-selected="1"]').forEach((el) => {
    el.removeAttribute('data-crm-selected')
    if (el.style) {
      el.style.outline = ''
      el.style.outlineOffset = ''
      const cleaned = String(el.getAttribute('style') || '')
        .replace(/outline[^;]*;?/gi, '')
        .replace(/outline-offset[^;]*;?/gi, '')
        .replace(/;;+/g, ';')
        .trim()
      if (cleaned) el.setAttribute('style', cleaned)
      else el.removeAttribute('style')
    }
  })
}
