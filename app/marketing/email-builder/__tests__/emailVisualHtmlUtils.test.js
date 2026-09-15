import { describe, expect, it } from 'vitest'
import {
  applyEditedInner,
  extractEditableHtml,
  extractHeadStyles,
  splitHtmlDocument,
} from '../emailVisualHtmlUtils'

const MSO_TEMPLATE = `<!DOCTYPE html>
<html>
<head><style type="text/css">.hero{color:red}</style></head>
<body bgcolor="#111">
<!--[if mso]><body width="100%"><![endif]-->
<p>Hello World</p>
<!--[if mso]></body><![endif]-->
</body>
</html>`

describe('extractEditableHtml', () => {
  it('keeps MSO nested body comments inside the real body', () => {
    const inner = extractEditableHtml(MSO_TEMPLATE)
    expect(inner).toContain('Hello World')
    expect(inner).toContain('<!--[if mso]><body width="100%">')
    expect(inner).toContain('<!--[if mso]></body>')
  })

  it('does not treat an MSO body comment as the document body on a fragment', () => {
    const inner = extractEditableHtml(MSO_TEMPLATE)
    const again = extractEditableHtml(inner)
    expect(again).toContain('Hello World')
    expect(again).toContain('<!--[if mso]><body width="100%">')
  })

  it('returns simple fragments unchanged', () => {
    const fragment = '<h1>Welcome</h1><p>Write your message…</p>'
    expect(extractEditableHtml(fragment)).toBe(fragment)
  })
})

describe('applyEditedInner', () => {
  it('splices edited text back into the full document without dropping head CSS', () => {
    const inner = extractEditableHtml(MSO_TEMPLATE).replace('Hello World', 'Hello Studio')
    const next = applyEditedInner(MSO_TEMPLATE, inner)
    expect(next).toContain('Hello Studio')
    expect(next).not.toContain('Hello World')
    expect(next).toContain('.hero{color:red}')
    expect(next).toContain('<body bgcolor="#111">')
    expect(next).toContain('<!--[if mso]><body width="100%">')
    // Canvas sync must not re-extract a garbled MSO slice after emit.
    expect(extractEditableHtml(next)).toBe(inner)
  })

  it('returns the edited inner when the source is not a full document', () => {
    expect(applyEditedInner('<p>Hi</p>', '<p>Hey</p>')).toBe('<p>Hey</p>')
  })
})

describe('splitHtmlDocument / extractHeadStyles', () => {
  it('finds the real body open/close tags', () => {
    const split = splitHtmlDocument(MSO_TEMPLATE)
    expect(split.isDocument).toBe(true)
    expect(split.prefix).toMatch(/<body bgcolor="#111">$/)
    expect(split.suffix).toMatch(/^<\/body>/)
  })

  it('extracts style tags from head', () => {
    expect(extractHeadStyles(MSO_TEMPLATE)).toContain('.hero{color:red}')
  })
})
