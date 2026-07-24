/**
 * Client-side helpers for per-condition AND/OR joins.
 * AND binds tighter than OR: A AND B OR C → (A AND B) OR C
 */

export function hydrateConditionJoins(conditions = [], fallbackLogic = 'AND') {
  return (conditions || []).map((c, i) => {
    const next = { ...c }
    if (i === 0) {
      delete next.join
      return next
    }
    if (next.join !== 'AND' && next.join !== 'OR') {
      next.join = fallbackLogic === 'OR' ? 'OR' : 'AND'
    }
    return next
  })
}

export function formatJoinedConditionEnglish(parts, conditions = []) {
  if (!parts.length) return ''

  const groups = []
  let current = [parts[0]]
  for (let i = 1; i < parts.length; i++) {
    if (conditions[i]?.join === 'OR') {
      groups.push(current)
      current = [parts[i]]
    } else {
      current.push(parts[i])
    }
  }
  groups.push(current)

  const hasOr = groups.length > 1
  return groups
    .map((g) => {
      const joined = g.join(' and ')
      return hasOr && g.length > 1 ? `(${joined})` : joined
    })
    .join(' or ')
}

/** Normalize joins before save: strip from first, default AND for the rest. */
export function normalizeConditionsForSave(conditions = []) {
  return (conditions || []).map((c, i) => {
    const next = { ...c }
    if (i === 0) {
      delete next.join
      return next
    }
    next.join = next.join === 'OR' ? 'OR' : 'AND'
    return next
  })
}
