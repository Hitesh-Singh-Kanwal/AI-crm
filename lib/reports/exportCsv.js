import { formatReportCellValue } from './formatReportCell'
import { computeColumnTotals, hasColumnTotals, formatColumnTotal } from './reportTotals'

function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function exportCurrentPageToCsv(rows, columns, filename, timeZone) {
  const header = columns.map((c) => csvEscape(c.label)).join(',')
  const body = rows
    .map((row) =>
      columns.map((c) => csvEscape(formatReportCellValue(row[c.key], c, timeZone))).join(',')
    )
    .join('\n')

  let csv = body ? `${header}\n${body}` : header

  if (rows.length && hasColumnTotals(columns)) {
    const totals = computeColumnTotals(rows, columns)
    const totalsRow = columns
      .map((c, idx) => csvEscape(idx === 0 ? 'Page Total' : c.key in totals ? formatColumnTotal(totals[c.key]) : ''))
      .join(',')
    csv = `${csv}\n${totalsRow}`
  }

  if (typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return csv
}
