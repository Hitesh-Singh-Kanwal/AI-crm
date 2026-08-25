/**
 * Group report rows by studio when a response actually spans more than one
 * location — e.g. a superadmin (or a viewAllLocations-permitted user) viewing
 * "All studios". Returns null when there's nothing to segregate (0 rows, or
 * every row belongs to the same studio), so callers can fall back to the
 * existing flat rendering with no extra branching.
 */
export function groupReportRowsByStudio(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null

  const groups = new Map()
  rows.forEach((row) => {
    const key = row?.studioName || '—'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  })

  if (groups.size <= 1) return null

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([studioName, groupRows]) => ({ studioName, rows: groupRows }))
}
