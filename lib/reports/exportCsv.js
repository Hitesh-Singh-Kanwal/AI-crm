function csvEscape(value) {
  const str = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function exportCurrentPageToCsv(rows, columns, filename) {
  const header = columns.map((c) => csvEscape(c.label)).join(',')
  const body = rows.map((row) => columns.map((c) => csvEscape(row[c.key])).join(',')).join('\n')
  const csv = body ? `${header}\n${body}` : header

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
