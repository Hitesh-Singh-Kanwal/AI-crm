import { formatReportCellValue } from './formatReportCell'
import { computeColumnTotals, hasColumnTotals, formatColumnTotal } from './reportTotals'

function pdfEscape(value) {
  const str = value === null || value === undefined ? '' : String(value)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildReportPdfHtml(rows, columns, title, timeZone) {
  const header = columns.map((c) => `<th>${pdfEscape(c.label)}</th>`).join('')
  const body = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((c) => `<td>${pdfEscape(formatReportCellValue(row[c.key], c, timeZone))}</td>`)
          .join('')}</tr>`
    )
    .join('')

  let footer = ''
  if (rows.length && hasColumnTotals(columns)) {
    const totals = computeColumnTotals(rows, columns)
    const totalsCells = columns
      .map(
        (c, idx) =>
          `<td>${idx === 0 ? 'Page Total' : c.key in totals ? pdfEscape(formatColumnTotal(totals[c.key])) : ''}</td>`
      )
      .join('')
    footer = `<tfoot><tr>${totalsCells}</tr></tfoot>`
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${pdfEscape(title)}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
    h1 { font-size: 18px; margin: 0 0 16px; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
    th { background: #f3f3f3; }
    tfoot td { font-weight: bold; background: #f8f8f8; }
  </style>
</head>
<body>
  <h1>${pdfEscape(title)}</h1>
  <table>
    <thead><tr>${header}</tr></thead>
    <tbody>${body || `<tr><td colspan="${columns.length}">No rows</td></tr>`}</tbody>
    ${footer}
  </table>
</body>
</html>`
}

export function exportCurrentPageToPdf(rows, columns, title, filename = 'report.pdf', timeZone) {
  const html = buildReportPdfHtml(rows, columns, title, timeZone)
  if (typeof window === 'undefined') return html

  const win = window.open('', '_blank')
  if (!win) return html
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  // Filename hint for print-to-PDF; browsers control actual save name
  win.document.title = filename.replace(/\.pdf$/i, '')
  setTimeout(() => {
    win.print()
  }, 250)
  return html
}
