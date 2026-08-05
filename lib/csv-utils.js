'use client'

// Small shared CSV helpers used by both the plain single-entity ImportExportCsv
// control and the customer Migration Import dialog's "Quick Add" mode, so the
// parsing/formatting logic isn't duplicated between them.

export function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/[\s_-]+/g, '')
}

export function toCSVValue(value) {
  const str = value === undefined || value === null ? '' : String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function parseCSVLine(line) {
  const result = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else { inQuotes = false }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      result.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  result.push(cur)
  return result.map((v) => v.trim())
}

export function triggerDownload(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Parses CSV text into row objects keyed by `fields[].key`, matching headers by `fields[].header`. */
export function parseCSVText(text, fields) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0)
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }
  const fileHeaders = parseCSVLine(lines[0]).map(normalizeHeader)

  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row = {}
    fields.forEach((f) => {
      const idx = fileHeaders.indexOf(normalizeHeader(f.header))
      row[f.key] = values[idx] !== undefined ? values[idx] : ''
    })
    rows.push(row)
  }
  return rows
}
