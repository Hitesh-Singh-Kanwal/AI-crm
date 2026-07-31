/** Sums columns marked `total: true` for report table footer rows. */

export function hasColumnTotals(columns) {
  return columns.some((col) => col.total)
}

export function computeColumnTotals(rows, columns) {
  const totals = {}
  columns.forEach((col) => {
    if (!col.total) return
    totals[col.key] = rows.reduce((sum, row) => {
      const value = Number(row[col.key])
      return sum + (Number.isFinite(value) ? value : 0)
    }, 0)
  })
  return totals
}

export function formatColumnTotal(value) {
  const rounded = Math.round(value * 100) / 100
  return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
