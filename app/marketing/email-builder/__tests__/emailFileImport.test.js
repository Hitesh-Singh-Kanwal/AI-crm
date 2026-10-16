import { describe, expect, it } from 'vitest'
import {
  EMAIL_BULK_MAX_FILES,
  EMAIL_IMPORT_MAX_BYTES,
  emailImportKind,
  plainTextToEmailHtml,
  readEmailImportFile,
  readEmailImportFolder,
  subjectFromImportFilename,
} from '../emailFileImport'

const fakeFile = (name, content, type = '') => ({
  name,
  type,
  size: content.length,
  text: async () => content,
})

describe('emailImportKind', () => {
  it('detects html and text files by extension or mime type', () => {
    expect(emailImportKind({ name: 'promo.HTML' })).toBe('html')
    expect(emailImportKind({ name: 'promo.htm' })).toBe('html')
    expect(emailImportKind({ name: 'notes.txt' })).toBe('text')
    expect(emailImportKind({ name: 'blob', type: 'text/plain' })).toBe('text')
    expect(emailImportKind({ name: 'logo.png', type: 'image/png' })).toBeNull()
  })
})

describe('plainTextToEmailHtml', () => {
  it('splits paragraphs, keeps line breaks, escapes markup and keeps merge tags', () => {
    const html = plainTextToEmailHtml('Hi {{first_name}},\r\nClasses < 5 & > 2 left.\n\n\nSee you soon')
    expect(html).toContain('<p style="margin:0 0 16px;">Hi {{first_name}},<br>\nClasses &lt; 5 &amp; &gt; 2 left.</p>')
    expect(html).toContain('<p style="margin:0 0 16px;">See you soon</p>')
    expect(html.match(/<p /g)).toHaveLength(2)
  })

  it('turns URLs into links without swallowing trailing punctuation', () => {
    const html = plainTextToEmailHtml('Book at https://cadance.ai/book. Or www.example.com!')
    expect(html).toContain('<a href="https://cadance.ai/book" style="color:#2563eb;">https://cadance.ai/book</a>.')
    expect(html).toContain('<a href="https://www.example.com" style="color:#2563eb;">www.example.com</a>!')
  })

  it('returns empty string for blank input', () => {
    expect(plainTextToEmailHtml('  \n\n ')).toBe('')
  })
})

describe('readEmailImportFile', () => {
  it('returns html files untouched apart from a BOM', async () => {
    const source = '\uFEFF<!DOCTYPE html><html><body><h1>Hi</h1></body></html>'
    await expect(readEmailImportFile(fakeFile('a.html', source))).resolves.toEqual({
      kind: 'html',
      html: source.slice(1),
    })
  })

  it('loads HTML source saved as .txt as HTML', async () => {
    const source = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional //EN">\n<!-- note -->\n<html><body><p>Hi</p></body></html>'
    await expect(readEmailImportFile(fakeFile('drip.txt', source))).resolves.toEqual({
      kind: 'html',
      html: source,
    })
    const fragment = '<table><tr><td>Hello {{first_name}}</td></tr></table>'
    await expect(readEmailImportFile(fakeFile('frag.txt', fragment))).resolves.toEqual({
      kind: 'html',
      html: fragment,
    })
  })

  it('converts text files', async () => {
    const result = await readEmailImportFile(fakeFile('a.txt', 'Hello'))
    expect(result.kind).toBe('text')
    expect(result.html).toContain('<p style="margin:0 0 16px;">Hello</p>')
  })

  it('rejects unsupported, empty and oversized files', async () => {
    await expect(readEmailImportFile(fakeFile('a.pdf', 'x'))).rejects.toThrow(/\.html/)
    await expect(readEmailImportFile(fakeFile('a.txt', '   '))).rejects.toThrow(/empty/)
    const big = { ...fakeFile('a.html', 'x'), size: EMAIL_IMPORT_MAX_BYTES + 1 }
    await expect(readEmailImportFile(big)).rejects.toThrow(/2 MB/)
  })
})

describe('subjectFromImportFilename', () => {
  it('turns file names into readable template subjects', () => {
    expect(subjectFromImportFilename('09-Lead Email Drip 9 - Dance to Reconnect-COPY-CODE.txt')).toBe(
      '09 Lead Email Drip 9 Dance to Reconnect COPY CODE',
    )
    expect(subjectFromImportFilename('folder/welcome_week_1.html')).toBe('welcome week 1')
  })
})

describe('readEmailImportFolder', () => {
  it('reads only email files and skips others', async () => {
    const items = await readEmailImportFolder([
      fakeFile('skip.pdf', '%PDF'),
      fakeFile('hello.txt', 'Hello {{first_name}}'),
      { ...fakeFile('promo.html', '<html><body>Hi</body></html>'), webkitRelativePath: 'drip/promo.html' },
    ])
    expect(items).toHaveLength(2)
    expect(items.map((i) => i.fileName).sort()).toEqual(['hello.txt', 'promo.html'])
    expect(items.find((i) => i.fileName === 'promo.html').path).toBe('drip/promo.html')
    expect(items.find((i) => i.fileName === 'hello.txt').html).toContain('Hello {{first_name}}')
  })

  it('rejects empty or oversized folders', async () => {
    await expect(readEmailImportFolder([fakeFile('a.pdf', 'x')])).rejects.toThrow(/No \.html/)
    const tooMany = Array.from({ length: EMAIL_BULK_MAX_FILES + 1 }, (_, i) =>
      fakeFile(`f${i}.txt`, 'hi'),
    )
    await expect(readEmailImportFolder(tooMany)).rejects.toThrow(/at most/)
  })
})
