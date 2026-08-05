'use client'

// Generic single-sheet Excel helpers for the shared ImportExportCsv control.
// `fields`: [{ key, header, sample }] — same shape used for CSV everywhere else.

import * as XLSX from 'xlsx'

function normalizeHeader(h) {
  return String(h || '').trim().toLowerCase().replace(/[\s_-]+/g, ' ')
}

// Finds the header row by matching against known field headers, so any
// instructional/example rows above it are ignored automatically — same
// approach as the migration importer's header detection.
function findHeaderRowIndex(rows, fields) {
  const known = new Set(fields.map((f) => normalizeHeader(f.header)))
  let bestIndex = -1
  let bestScore = 0
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const row = rows[i] || []
    const score = row.filter((cell) => known.has(normalizeHeader(cell))).length
    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }
  return bestScore >= 1 ? bestIndex : -1
}

/** Parses the first sheet of an uploaded .xlsx/.xls File into row objects keyed by `fields[].key`. */
export function parseXlsxRows(file, fields) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) throw new Error('Workbook has no sheets')
        const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' })

        const headerIndex = findHeaderRowIndex(rawRows, fields)
        if (headerIndex === -1) {
          throw new Error('Could not find a recognizable header row — check the file matches the sample columns')
        }
        const headerRow = rawRows[headerIndex].map(normalizeHeader)
        const colIndexByKey = new Map()
        fields.forEach(({ key, header }) => {
          const idx = headerRow.indexOf(normalizeHeader(header))
          if (idx !== -1) colIndexByKey.set(key, idx)
        })

        const rows = []
        for (let i = headerIndex + 1; i < rawRows.length; i++) {
          const raw = rawRows[i] || []
          if (raw.every((cell) => String(cell ?? '').trim() === '')) continue
          const row = {}
          fields.forEach(({ key }) => {
            const idx = colIndexByKey.get(key)
            row[key] = idx !== undefined && raw[idx] !== undefined ? String(raw[idx]).trim() : ''
          })
          rows.push(row)
        }
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
    reader.readAsArrayBuffer(file)
  })
}

/** Downloads a one-row sample .xlsx for the given fields. */
export function downloadXlsxSample(fields, filename, sheetName = 'Sheet1') {
  const headers = fields.map((f) => f.header)
  const sampleRow = fields.map((f) => f.sample ?? '')
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, sampleRow]), sheetName)
  XLSX.writeFile(workbook, filename)
}

/** Downloads `rows` (keyed by fields[].key) as a .xlsx file. */
export function downloadXlsxExport(fields, rows, filename, sheetName = 'Sheet1') {
  const headers = fields.map((f) => f.header)
  const aoa = [headers, ...rows.map((row) => fields.map((f) => row[f.key] ?? ''))]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoa), sheetName)
  XLSX.writeFile(workbook, filename)
}
