/** Importing an email template body from an uploaded .html / .htm / .txt file. */

export const EMAIL_IMPORT_ACCEPT = '.html,.htm,.txt,text/html,text/plain'
export const EMAIL_IMPORT_MAX_BYTES = 2 * 1024 * 1024

const HTML_EXT_RE = /\.html?$/i
const TEXT_EXT_RE = /\.txt$/i

export function emailImportKind(file) {
  const name = String(file?.name || '')
  const type = String(file?.type || '').toLowerCase()
  if (HTML_EXT_RE.test(name) || type === 'text/html') return 'html'
  if (TEXT_EXT_RE.test(name) || type === 'text/plain') return 'text'
  return null
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const URL_RE = /\b(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]|www\.[^\s<]+[^\s<.,;:!?)\]'"])/gi

function linkify(escapedLine) {
  return escapedLine.replace(URL_RE, (url) => {
    const href = url.startsWith('www.') ? `https://${url}` : url
    return `<a href="${href}" style="color:#2563eb;">${url}</a>`
  })
}

/**
 * Plain text → simple email-safe HTML: blank lines split paragraphs, single
 * newlines become <br>, URLs become links. Merge tags like {{name}} pass through.
 */
export function plainTextToEmailHtml(text) {
  const normalized = String(text || '').replace(/\r\n?/g, '\n').trim()
  if (!normalized) return ''
  const paragraphs = normalized
    .split(/\n\s*\n+/)
    .map((block) =>
      block
        .split('\n')
        .map((line) => linkify(escapeHtml(line.trimEnd())))
        .join('<br>\n'),
    )
    .map((inner) => `  <p style="margin:0 0 16px;">${inner}</p>`)
  return [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1f2937;">',
    ...paragraphs,
    '</div>',
  ].join('\n')
}

const HTML_START_RE = /^<(!doctype\s+html|html[\s>]|!--)/i
const HTML_CLOSING_TAG_RE =
  /<\/(html|head|body|table|tbody|thead|tr|td|th|div|p|span|a|h[1-6]|ul|ol|li|center|style|font|strong|em|b|i|u|section)\s*>/i
const HTML_VOID_TAG_RE = /<(br|img|hr|meta|link)\b[^>]*\/?>/i

/** True when text is HTML source (e.g. email HTML saved as .txt) rather than prose. */
export function looksLikeHtml(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return false
  return (
    HTML_START_RE.test(trimmed) || HTML_CLOSING_TAG_RE.test(trimmed) || HTML_VOID_TAG_RE.test(trimmed)
  )
}

/** Reads an uploaded file into template HTML. Throws with a user-facing message. */
export async function readEmailImportFile(file) {
  if (!emailImportKind(file)) throw new Error('Choose an .html, .htm or .txt file.')
  if (file.size > EMAIL_IMPORT_MAX_BYTES) throw new Error('File is larger than 2 MB.')
  const raw = (await file.text()).replace(/^\uFEFF/, '')
  if (!raw.trim()) throw new Error('The file is empty.')
  if (emailImportKind(file) === 'html' || looksLikeHtml(raw)) return { kind: 'html', html: raw }
  return { kind: 'text', html: plainTextToEmailHtml(raw) }
}
