import { describe, expect, it } from 'vitest'
import {
  extractStudioFooterBlock,
  injectFooterIntoHtml,
  stripInjectedFooter,
} from '../email-footer'

const LOC = { _id: 'loc1', name: 'Dance With Me Midtown', phone: '+18777302307', address: '37 west 37th street' }

const countTables = (html) => {
  const tags = String(html).replace(/<!--[\s\S]*?-->/g, '')
  return {
    opens: (tags.match(/<table\b/gi) || []).length,
    closes: (tags.match(/<\/table\s*>/gi) || []).length,
  }
}

// Mirrors designed drip templates: hidden preheader + a wrapper div, and a small
// hairline table whose closer is followed by </td> (the case that used to be eaten).
const DESIGNED = `<!DOCTYPE html>
<html><head><style>html,body{height:100% !important}</style></head>
<body style="margin:0">
<div style="display:none">Preheader</div>
<div style="background-color:#2E2E2E">
<table role="presentation" width="100%"><tr><td align="center">
  <table class="container" width="600" style="width:600px">
    <tr><td style="padding:19px 24px 22px">
      <table role="presentation" width="54"><tr>
        <td height="2" style="height:2px">&nbsp;</td>
      </tr></table>
    </td></tr>
    <tr><td><table class="card" width="100%"><tr><td>Hi {{first_name}}</td></tr></table></td></tr>
  </table>
</td></tr></table>
</div>
</body></html>`

describe('studio footer nesting', () => {
  it('keeps every template table closed when adding a footer', () => {
    const withFooter = injectFooterIntoHtml(DESIGNED, LOC)
    expect(extractStudioFooterBlock(withFooter)).toBeTruthy()
    const { opens, closes } = countTables(withFooter)
    expect(closes).toBe(opens)
    expect(withFooter).toMatch(/<td height="2" style="height:2px">&nbsp;<\/td>\s*<\/tr><\/table>/)
  })

  it('round-trips: removing the footer restores the original template', () => {
    const withFooter = injectFooterIntoHtml(DESIGNED, LOC)
    expect(stripInjectedFooter(withFooter).trim()).toBe(DESIGNED.trim())
  })

  it('re-applying the footer does not pile up wrappers or drop closers', () => {
    const once = injectFooterIntoHtml(DESIGNED, LOC)
    const twice = injectFooterIntoHtml(once, { ...LOC, _id: 'loc2' })
    expect(countTables(twice)).toEqual(countTables(once))
    expect(twice).toContain('data-cadance-studio-footer="loc2"')
    expect(twice).not.toContain('data-cadance-studio-footer="loc1"')
  })

  it('leaves HTML without a footer untouched', () => {
    expect(stripInjectedFooter(DESIGNED)).toBe(DESIGNED)
  })

  it('appends a row for single-table bodies and removes it cleanly', () => {
    const single = '<html><body><table width="600"><tr><td><table><tr><td>x</td></tr></table></td></tr></table></body></html>'
    const withFooter = injectFooterIntoHtml(single, LOC)
    expect(countTables(withFooter).closes).toBe(countTables(withFooter).opens)
    expect(stripInjectedFooter(withFooter).replace(/\s+/g, '')).toBe(single.replace(/\s+/g, ''))
  })

  it('still drops stray closers left by older strips', () => {
    const legacy = DESIGNED.replace('</div>\n</body>', '</td></tr></table>\n</div>\n</body>')
    const cleaned = stripInjectedFooter(legacy)
    expect(countTables(cleaned).closes).toBe(countTables(cleaned).opens)
  })
})
